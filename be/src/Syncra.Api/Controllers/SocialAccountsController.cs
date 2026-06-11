using System.Text.Json;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Infrastructure.Jobs;
using Syncra.Infrastructure.Persistence;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/social-accounts")]
public sealed class SocialAccountsController : ControllerBase
{
    private const string DisconnectGraceCacheKeyPrefix = "disconnect_grace:";

    private readonly AppDbContext _db;
    private readonly IZernioClient _zernioClient;
    private readonly IDistributedCache _cache;
    private readonly IBackgroundJobClient _backgroundJobs;
    private readonly ILogger<SocialAccountsController> _logger;

    public SocialAccountsController(
        AppDbContext db,
        IZernioClient zernioClient,
        IDistributedCache cache,
        IBackgroundJobClient backgroundJobs,
        ILogger<SocialAccountsController> logger)
    {
        _db = db;
        _zernioClient = zernioClient;
        _cache = cache;
        _backgroundJobs = backgroundJobs;
        _logger = logger;
    }

    // ── GET /api/v1/social-accounts ──────────────────────────────────────────

    /// <summary>
    /// Returns active social accounts for the current workspace, paged.
    /// Syncs profilePicture from Zernio on each call so avatars stay current for all platforms.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSocialAccounts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 200);

        // Sync profilePicture from Zernio so avatars are always up-to-date
        var zernioProfile = await ResolveZernioProfileAsync(workspaceId.Value, cancellationToken);

        Dictionary<string, ZernioAccountDto>? zernioByExternalId = null;

        if (zernioProfile is not null)
        {
            try
            {
                var zernioResponse = await _zernioClient.ListAccountsAsync(
                    zernioProfile.ZernioProfileId,
                    cancellationToken: cancellationToken);

                zernioByExternalId = zernioResponse.Accounts.ToDictionary(a => a.Id);

                var pictureMap = zernioResponse.Accounts
                    .Where(a => !string.IsNullOrEmpty(a.ProfilePicture))
                    .ToDictionary(a => a.Id, a => a.ProfilePicture!);

                if (pictureMap.Count > 0)
                {
                    var accountsToUpdate = await _db.SocialAccounts
                        .Where(sa => sa.WorkspaceId == workspaceId.Value && sa.IsActive)
                        .ToListAsync(cancellationToken);

                    var anyUpdated = false;
                    foreach (var acc in accountsToUpdate)
                    {
                        if (pictureMap.TryGetValue(acc.ExternalAccountId, out var pic) && acc.AvatarUrl != pic)
                        {
                            acc.Update(acc.DisplayName, pic);
                            anyUpdated = true;
                        }
                    }

                    if (anyUpdated)
                        await _db.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to sync profilePicture from Zernio for workspace {WorkspaceId} — returning local data",
                    workspaceId.Value);
            }
        }

        var baseQuery = _db.SocialAccounts
            .AsNoTracking()
            .Where(sa => sa.WorkspaceId == workspaceId.Value && sa.IsActive);

        if (zernioProfile != null)
        {
            baseQuery = baseQuery.Where(sa => sa.ZernioProfileId == zernioProfile.Id);
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        var totalPages = safePageSize > 0 ? (int)Math.Ceiling((double)totalItems / safePageSize) : 0;

        var dbItems = await baseQuery
            .OrderBy(sa => sa.ConnectedAtUtc)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Select(sa => new
            {
                sa.Id,
                sa.Platform,
                sa.DisplayName,
                sa.AvatarUrl,
                sa.IsActive,
                sa.ConnectedAtUtc,
                sa.ExternalAccountId,
                sa.ZernioProfileId
            })
            .ToListAsync(cancellationToken);

        var enrichedItems = dbItems.Select(item =>
        {
            ZernioAccountDto? zernio = null;
            if (zernioByExternalId?.TryGetValue(item.ExternalAccountId, out var z) == true)
                zernio = z;
            return new
            {
                item.Id,
                item.Platform,
                item.DisplayName,
                item.AvatarUrl,
                item.IsActive,
                item.ConnectedAtUtc,
                item.ExternalAccountId,
                item.ZernioProfileId,
                profileUrl = zernio?.ProfileUrl,
                username = zernio?.Username,
                metadata = zernio?.Metadata,
                followersCount = zernio?.FollowersCount,
                followersLastUpdated = zernio?.FollowersLastUpdated,
                parentAccountId = zernio?.ParentAccountId,
                enabled = zernio?.Enabled
            };
        }).ToList();

        return Ok(new
        {
            items = enrichedItems,
            pagination = new
            {
                page = safePage,
                pageSize = safePageSize,
                totalItems,
                totalPages,
            }
        });
    }

    // ── GET /api/v1/social-accounts/connect-url/{platform} ──────────────────

    /// <summary>
    /// Returns an OAuth connect URL for the specified platform.
    /// Lazily provisions a Zernio Profile for the workspace if one does not exist.
    /// Saves a CSRF state token to Redis with 15-minute TTL.
    /// </summary>
    [HttpGet("connect-url/{platform}")]
    public async Task<IActionResult> GetConnectUrl(
        string platform,
        [FromQuery] string redirectUrl,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        if (string.IsNullOrWhiteSpace(redirectUrl))
        {
            return BadRequest(new { code = "missing_redirect_url", message = "redirectUrl query parameter is required." });
        }

        // 1. Lazy provision Zernio Profile for workspace
        var zernioProfile = await GetOrProvisionZernioProfileAsync(workspaceId.Value, cancellationToken);

        // 2. Generate state token and persist to Redis (CSRF mitigation T-25-03-01)
        var stateToken = Guid.NewGuid().ToString("N");
        var cacheKey = $"oauth_state:{stateToken}";
        var stateData = JsonSerializer.Serialize(new
        {
            WorkspaceId = workspaceId.Value,
            Platform = platform.ToLowerInvariant()
        });

        await _cache.SetStringAsync(cacheKey, stateData, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15)
        }, cancellationToken);

        _logger.LogInformation(
            "OAuth state {StateToken} created for workspace {WorkspaceId}, platform {Platform}",
            stateToken, workspaceId.Value, platform);

        // 3. Build redirect URL with state parameter
        var separator = redirectUrl.Contains('?') ? '&' : '?';
        var redirectWithState = $"{redirectUrl}{separator}state={stateToken}";

        // 4. Get headless connect URL from Zernio
        var connectUrlResult = await _zernioClient.GetConnectUrlAsync(
            profileId: zernioProfile.ZernioProfileId,
            platform: platform,
            redirectUrl: redirectWithState,
            headless: true,
            cancellationToken: cancellationToken);

        return Ok(new { connectUrl = connectUrlResult.ConnectUrl, state = stateToken });
    }

    // ── GET /api/v1/social-accounts/{platform}/pages?tempToken=X&state=token ─

    /// <summary>
    /// Verifies and consumes the OAuth state token, then returns the list of
    /// secondary options (pages, orgs, locations, boards) for the given platform.
    /// </summary>
    [HttpGet("{platform}/pages")]
    public async Task<IActionResult> GetSelectOptions(
        string platform,
        [FromQuery] string tempToken,
        [FromQuery] string state,
        [FromQuery] string? userProfile,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        // Verify and consume state token (T-25-03-01)
        var resolvedWorkspaceId = await VerifyAndConsumeStateTokenAsync(state, workspaceId.Value, platform, cancellationToken);
        if (resolvedWorkspaceId is null)
        {
            _logger.LogWarning(
                "Invalid or expired state token {State} for workspace {WorkspaceId}",
                state, workspaceId.Value);
            return BadRequest(new { code = "invalid_state", message = "OAuth state token is invalid or has expired." });
        }

        var zernioProfile = await ResolveZernioProfileAsync(resolvedWorkspaceId.Value, cancellationToken);

        if (zernioProfile is null)
        {
            return NotFound(new { code = "not_found", message = "Zernio profile not found for this workspace." });
        }

        var options = await _zernioClient.ListSelectOptionsAsync(
            profileId: zernioProfile.ZernioProfileId,
            platform: platform,
            tempToken: tempToken,
            userProfile: userProfile,
            cancellationToken: cancellationToken);

        return Ok(new { platform = platform.ToLowerInvariant(), options });
    }

    // ── POST /api/v1/social-accounts/{platform}/select-page ─────────────────

    /// <summary>
    /// Completes headless selection: calls Zernio to bind the selected page/org/board,
    /// then creates or reactivates the local SocialAccount record.
    /// </summary>
    [HttpPost("{platform}/select-page")]
    public async Task<IActionResult> SelectPage(
        string platform,
        [FromBody] SelectPageRequest request,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var zernioProfile = await ResolveZernioProfileAsync(workspaceId.Value, cancellationToken);

        if (zernioProfile is null)
        {
            return NotFound(new { code = "not_found", message = "Zernio profile not found for this workspace." });
        }

        // Call Zernio to complete selection (T-25-03-02: workspace ownership verified above)
        var result = await _zernioClient.SelectOptionAsync(
            profileId: zernioProfile.ZernioProfileId,
            platform: platform,
            tempToken: request.TempToken,
            selectedId: request.SelectedId,
            selectedName: request.SelectedName,
            userProfile: request.UserProfile,
            cancellationToken: cancellationToken);

        // Try to get explicit ProfileId from context (set by ProfileResolutionMiddleware)
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
        if (explicitProfileId != null)
        {
            var p = await _db.ZernioProfiles.FindAsync(explicitProfileId.Value);
            if (p != null) zernioProfile = p;
        }

        // Create or reactivate local SocialAccount
        var existing = await _db.SocialAccounts
            .FirstOrDefaultAsync(sa =>
                sa.WorkspaceId == workspaceId.Value &&
                sa.ExternalAccountId == result.AccountId &&
                sa.Platform == platform.ToLowerInvariant(),
                cancellationToken);

        if (existing is not null)
        {
            await _cache.RemoveAsync($"{DisconnectGraceCacheKeyPrefix}{existing.Id}", cancellationToken);

            if (!existing.IsActive)
            {
                existing.Reactivate();
                existing.Update(result.DisplayName, result.ProfilePicture);
            }
            else
            {
                existing.Update(result.DisplayName, result.ProfilePicture);
            }

            _logger.LogInformation(
                "Reactivated existing SocialAccount {AccountId} for workspace {WorkspaceId}",
                existing.Id, workspaceId.Value);
        }
        else
        {
            var newAccount = SocialAccount.Create(
                workspaceId: workspaceId.Value,
                zernioProfileId: zernioProfile.Id,
                externalAccountId: result.AccountId,
                platform: platform,
                displayName: result.DisplayName,
                avatarUrl: result.ProfilePicture);

            _db.SocialAccounts.Add(newAccount);
            existing = newAccount;

            _logger.LogInformation(
                "Created SocialAccount {ExternalId} for workspace {WorkspaceId}, platform {Platform}",
                result.AccountId, workspaceId.Value, platform);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = existing.Id,
            platform = existing.Platform,
            displayName = existing.DisplayName,
            avatarUrl = existing.AvatarUrl,
            connectedAtUtc = existing.ConnectedAtUtc
        });
    }

    // ── POST /api/v1/social-accounts/direct-connect ─────────────────────────

    /// <summary>
    /// Creates or reactivates a local SocialAccount record directly for platforms
    /// that do not require a sub-entity selection step.
    /// </summary>
    [HttpPost("direct-connect")]
    public async Task<IActionResult> DirectConnect(
        [FromBody] DirectConnectRequest request,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        // Verify and consume state token (T-25-03-01)
        var resolvedWorkspaceId = await VerifyAndConsumeStateTokenAsync(request.State, workspaceId.Value, request.Platform, cancellationToken);
        if (resolvedWorkspaceId is null)
        {
            _logger.LogWarning(
                "Invalid or expired state token {State} for workspace {WorkspaceId}",
                request.State, workspaceId.Value);
            return BadRequest(new { code = "invalid_state", message = "OAuth state token is invalid or has expired." });
        }

        var zernioProfile = await ResolveZernioProfileAsync(resolvedWorkspaceId.Value, cancellationToken);

        if (zernioProfile is null)
        {
            return NotFound(new { code = "not_found", message = "Zernio profile not found for this workspace." });
        }

        // Try to get explicit ProfileId from context (set by ProfileResolutionMiddleware)
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
        if (explicitProfileId != null)
        {
            var p = await _db.ZernioProfiles.FindAsync(explicitProfileId.Value);
            if (p != null) zernioProfile = p;
        }

        // Create or reactivate local SocialAccount
        var existing = await _db.SocialAccounts
            .FirstOrDefaultAsync(sa =>
                sa.WorkspaceId == resolvedWorkspaceId.Value &&
                sa.ExternalAccountId == request.AccountId &&
                sa.Platform == request.Platform.ToLowerInvariant(),
                cancellationToken);

        if (existing is not null)
        {
            await _cache.RemoveAsync($"{DisconnectGraceCacheKeyPrefix}{existing.Id}", cancellationToken);

            if (!existing.IsActive)
            {
                existing.Reactivate();
                existing.Update(request.DisplayName, existing.AvatarUrl);
            }
            else
            {
                existing.Update(request.DisplayName, existing.AvatarUrl);
            }

            _logger.LogInformation(
                "Reactivated existing SocialAccount {AccountId} via direct connect for workspace {WorkspaceId}",
                existing.Id, resolvedWorkspaceId.Value);
        }
        else
        {
            var newAccount = SocialAccount.Create(
                workspaceId: resolvedWorkspaceId.Value,
                zernioProfileId: zernioProfile.Id,
                externalAccountId: request.AccountId,
                platform: request.Platform,
                displayName: request.DisplayName,
                avatarUrl: null); // Will be synced on next list or fetch

            _db.SocialAccounts.Add(newAccount);
            existing = newAccount;

            _logger.LogInformation(
                "Created SocialAccount {ExternalId} via direct connect for workspace {WorkspaceId}, platform {Platform}",
                request.AccountId, resolvedWorkspaceId.Value, request.Platform);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = existing.Id,
            platform = existing.Platform,
            displayName = existing.DisplayName,
            avatarUrl = existing.AvatarUrl,
            connectedAtUtc = existing.ConnectedAtUtc
        });
    }

    // ── DELETE /api/v1/social-accounts/{accountId} ──────────────────────────

    /// <summary>
    /// Soft-deactivates the SocialAccount, calls Zernio to disconnect, and
    /// cancels scheduled posts after a 1-hour grace period unless the account reconnects.
    /// </summary>
    [HttpDelete("{accountId:guid}")]
    public async Task<IActionResult> Delete(
        Guid accountId,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        // T-25-03-02: Verify the account belongs to the current workspace
        var account = await _db.SocialAccounts
            .Include(sa => sa.ZernioProfile)
            .FirstOrDefaultAsync(
                sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value,
                cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        if (!account.IsActive)
        {
            return Ok(new { message = "Account is already disconnected." });
        }

        // Disconnect from Zernio
        try
        {
            await _zernioClient.DisconnectAccountAsync(
                profileId: account.ZernioProfile.ZernioProfileId,
                accountId: account.ExternalAccountId,
                cancellationToken: cancellationToken);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex,
                "Zernio disconnect failed for account {AccountId} — proceeding with local deactivation",
                accountId);
            // Non-fatal: proceed with local deactivation even if Zernio call fails
        }

        // Soft-deactivate local record
        account.Deactivate();

        var scheduledCountForAccount = await _db.Posts
            .AsNoTracking()
            .Where(p =>
                p.WorkspaceId == workspaceId.Value
                && p.Status == PostStatus.Scheduled
                && p.PlatformTargets.Any(t => t.ZernioAccountId == account.ExternalAccountId))
            .CountAsync(cancellationToken);

        if (scheduledCountForAccount > 0)
        {
            var graceToken = Guid.NewGuid().ToString("N");
            await _cache.SetStringAsync(
                $"{DisconnectGraceCacheKeyPrefix}{accountId}",
                graceToken,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(2)
                },
                cancellationToken);

            _backgroundJobs.Schedule<CancelScheduledPostsForDisconnectedAccountJob>(
                job => job.ExecuteAsync(accountId, graceToken, CancellationToken.None),
                TimeSpan.FromHours(1));
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "SocialAccount {AccountId} deactivated for workspace {WorkspaceId}. Scheduled posts count for account: {Count}.",
            accountId,
            workspaceId.Value,
            scheduledCountForAccount);

        return NoContent();
    }

    // ── GET /api/v1/social-accounts/{accountId}/health ──────────────────────

    /// <summary>
    /// Returns detailed health info for a specific social account from Zernio.
    /// </summary>
    [HttpGet("{accountId:guid}/health")]
    public async Task<IActionResult> GetHealth(
        Guid accountId,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var account = await _db.SocialAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value && sa.IsActive, cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        var health = await _zernioClient.GetAccountHealthAsync(
            accountId: account.ExternalAccountId,
            cancellationToken: cancellationToken);

        return Ok(health);
    }

    // ── GET /api/v1/social-accounts/{accountId}/facebook-page ──────

    /// <summary>
    /// Returns all Facebook pages the connected account has access to,
    /// including the currently selected page.
    /// </summary>
    [HttpGet("{accountId:guid}/facebook-page")]
    public async Task<IActionResult> GetFacebookPages(
        Guid accountId,
        [FromQuery] bool? refresh = null,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var account = await _db.SocialAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value && sa.IsActive,
                cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        var pages = await _zernioClient.GetFacebookPagesAsync(
            accountId: account.ExternalAccountId,
            refresh: refresh,
            cancellationToken: cancellationToken);

        return Ok(pages);
    }

    // ── PUT /api/v1/social-accounts/{accountId}/facebook-page ──────

    /// <summary>
    /// Switches which Facebook Page is active for a connected account.
    /// </summary>
    [HttpPut("{accountId:guid}/facebook-page")]
    public async Task<IActionResult> UpdateFacebookPage(
        Guid accountId,
        [FromBody] UpdateFacebookPageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var account = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value && sa.IsActive,
                cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        var selectedPage = await _zernioClient.UpdateFacebookPageAsync(
            accountId: account.ExternalAccountId,
            selectedPageId: request.SelectedPageId,
            cancellationToken: cancellationToken);

        if (selectedPage is not null)
        {
            account.Update(selectedPage.Name, account.AvatarUrl);
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Switched Facebook page for account {AccountId} to page {PageId}",
            accountId, request.SelectedPageId);

        return Ok(new { message = "Facebook page switched successfully." });
    }

    // ── GET /api/v1/social-accounts/{accountId}/linkedin-organization ──────

    /// <summary>
    /// Returns all LinkedIn organizations the connected account has access to,
    /// including the currently selected organization.
    /// </summary>
    [HttpGet("{accountId:guid}/linkedin-organization")]
    public async Task<IActionResult> GetLinkedInOrganizations(
        Guid accountId,
        [FromQuery] bool? refresh = null,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var account = await _db.SocialAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value && sa.IsActive,
                cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        var organizations = await _zernioClient.GetLinkedInOrganizationsAsync(
            accountId: account.ExternalAccountId,
            refresh: refresh,
            cancellationToken: cancellationToken);

        return Ok(organizations);
    }

    // ── PUT /api/v1/social-accounts/{accountId}/linkedin-organization ──────

    /// <summary>
    /// Switches which LinkedIn Organization is active for a connected account.
    /// </summary>
    [HttpPut("{accountId:guid}/linkedin-organization")]
    public async Task<IActionResult> UpdateLinkedInOrganization(
        Guid accountId,
        [FromBody] UpdateLinkedInOrganizationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var account = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value && sa.IsActive,
                cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        var selectedOrg = await _zernioClient.UpdateLinkedInOrganizationAsync(
            accountId: account.ExternalAccountId,
            selectedOrganizationUrn: request.SelectedOrganizationUrn,
            cancellationToken: cancellationToken);

        if (selectedOrg is not null)
        {
            account.Update(selectedOrg.Name, selectedOrg.LogoUrl ?? account.AvatarUrl);
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Switched LinkedIn organization for account {AccountId} to org {OrganizationUrn}",
            accountId, request.SelectedOrganizationUrn);

        return Ok(new { message = "LinkedIn organization switched successfully." });
    }

    // ── GET /api/v1/social-accounts/{accountId}/tiktok-creator-info ──────

    /// <summary>
    /// Returns TikTok creator info the connected account has access to.
    /// </summary>
    [HttpGet("{accountId:guid}/tiktok-creator-info")]
    public async Task<IActionResult> GetTikTokCreatorInfo(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var account = await _db.SocialAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                sa => sa.Id == accountId && sa.WorkspaceId == workspaceId.Value && sa.IsActive,
                cancellationToken);

        if (account is null)
        {
            return NotFound(new { code = "not_found", message = "Social account not found." });
        }

        var info = await _zernioClient.GetTikTokCreatorInfoAsync(
            accountId: account.ExternalAccountId,
            mediaType: null,
            cancellationToken: cancellationToken);

        return Ok(info);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task<ZernioProfile> GetOrProvisionZernioProfileAsync(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var profile = await ResolveZernioProfileAsync(workspaceId, cancellationToken);

        if (profile is not null)
        {
            return profile;
        }

        _logger.LogWarning(
            "No Zernio profile found for workspace {WorkspaceId}. This should not happen after workspace-profile sync migration. Falling back to provisioning.",
            workspaceId);

        // Fallback: fetch workspace name and provision
        var workspace = await _db.Workspaces
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        var profileName = workspace?.Name.Value ?? workspaceId.ToString("N");

        var provisioned = await _zernioClient.ProvisionProfileAsync(
            workspaceId: workspaceId.ToString(),
            name: profileName,
            cancellationToken: cancellationToken);

        var newProfile = ZernioProfile.Create(
            workspaceId: workspaceId,
            zernioProfileId: provisioned.Id,
            displayName: provisioned.Name,
            platform: "zernio");

        _db.ZernioProfiles.Add(newProfile);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Fallback: Provisioned Zernio profile {ProfileId} for workspace {WorkspaceId}",
            provisioned.Id, workspaceId);

        return newProfile;
    }

    private async Task<ZernioProfile?> ResolveZernioProfileAsync(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        // 1. Try to get explicit ProfileId from context (set by ProfileResolutionMiddleware)
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;

        if (explicitProfileId != null)
        {
            return await _db.ZernioProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == explicitProfileId && p.WorkspaceId == workspaceId && p.IsActive, cancellationToken);
        }

        // 2. Fallback to default logic if no explicit profile is provided
        var profiles = await _db.ZernioProfiles
            .AsNoTracking()
            .Where(p => p.WorkspaceId == workspaceId && p.IsActive)
            .ToListAsync(cancellationToken);

        if (profiles.Count == 0)
            return null;

        if (profiles.Count > 1)
        {
            _logger.LogWarning(
                "Workspace {WorkspaceId} has {Count} active Zernio profiles — using first for social account resolution.",
                workspaceId,
                profiles.Count);
        }

        return profiles[0];
    }

    private async Task<Guid?> VerifyAndConsumeStateTokenAsync(
        string state,
        Guid workspaceId,
        string platform,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"oauth_state:{state}";
        var cachedData = await _cache.GetStringAsync(cacheKey, cancellationToken);

        if (cachedData is null)
        {
            return null;
        }

        // Consume the token (one-time use)
        await _cache.RemoveAsync(cacheKey, cancellationToken);

        try
        {
            var stateObj = JsonSerializer.Deserialize<OAuthStateData>(cachedData);
            if (stateObj is null) return null;

            // Verify the workspace matches (T-25-03-02)
            if (stateObj.WorkspaceId != workspaceId) return null;

            return stateObj.WorkspaceId;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record OAuthStateData(Guid WorkspaceId, string Platform);
}

public sealed record SelectPageRequest(
    string TempToken,
    string SelectedId,
    string? SelectedName = null,
    object? UserProfile = null);

public sealed record UpdateFacebookPageRequestDto(
    string SelectedPageId);

public sealed record UpdateLinkedInOrganizationRequestDto(
    string SelectedOrganizationUrn);

public sealed record DirectConnectRequest(
    string State,
    string? ConnectToken,
    string Platform,
    string AccountId,
    string DisplayName);
