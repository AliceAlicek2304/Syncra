using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Infrastructure.Persistence;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/social-accounts")]
public sealed class SocialAccountsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IZernioClient _zernioClient;
    private readonly IDistributedCache _cache;
    private readonly ILogger<SocialAccountsController> _logger;

    public SocialAccountsController(
        AppDbContext db,
        IZernioClient zernioClient,
        IDistributedCache cache,
        ILogger<SocialAccountsController> logger)
    {
        _db = db;
        _zernioClient = zernioClient;
        _cache = cache;
        _logger = logger;
    }

    // ── GET /api/v1/social-accounts ──────────────────────────────────────────

    /// <summary>
    /// Returns all active social accounts for the current workspace.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSocialAccounts(CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        var accounts = await _db.SocialAccounts
            .AsNoTracking()
            .Where(sa => sa.WorkspaceId == workspaceId.Value && sa.IsActive)
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

        return Ok(accounts);
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
        var redirectWithState = $"{redirectUrl}?state={stateToken}";

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

        var zernioProfile = await _db.ZernioProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.WorkspaceId == resolvedWorkspaceId.Value && p.IsActive, cancellationToken);

        if (zernioProfile is null)
        {
            return NotFound(new { code = "not_found", message = "Zernio profile not found for this workspace." });
        }

        var options = await _zernioClient.ListSelectOptionsAsync(
            profileId: zernioProfile.ZernioProfileId,
            platform: platform,
            tempToken: tempToken,
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

        var zernioProfile = await _db.ZernioProfiles
            .FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId.Value && p.IsActive, cancellationToken);

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
            cancellationToken: cancellationToken);

        // Create or reactivate local SocialAccount
        var existing = await _db.SocialAccounts
            .FirstOrDefaultAsync(sa =>
                sa.WorkspaceId == workspaceId.Value &&
                sa.ExternalAccountId == result.AccountId &&
                sa.Platform == platform.ToLowerInvariant(),
                cancellationToken);

        if (existing is not null)
        {
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

    // ── DELETE /api/v1/social-accounts/{accountId} ──────────────────────────

    /// <summary>
    /// Soft-deactivates the SocialAccount, calls Zernio to disconnect, and
    /// unschedules any scheduled posts targeting this account's workspace.
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

        // Unschedule any scheduled posts for this workspace (T-25-03-04 audit)
        var scheduledPosts = await _db.Posts
            .Where(p => p.WorkspaceId == workspaceId.Value && p.Status == PostStatus.Scheduled)
            .ToListAsync(cancellationToken);

        var unscheduledCount = 0;
        foreach (var post in scheduledPosts)
        {
            try
            {
                post.Unschedule();
                unscheduledCount++;
            }
            catch (DomainException)
            {
                // Ignore posts that cannot be unscheduled (already changed status)
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "SocialAccount {AccountId} deactivated for workspace {WorkspaceId}. Unscheduled {Count} posts.",
            accountId, workspaceId.Value, unscheduledCount);

        return NoContent();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task<ZernioProfile> GetOrProvisionZernioProfileAsync(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var existing = await _db.ZernioProfiles
            .FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId && p.IsActive, cancellationToken);

        if (existing is not null)
        {
            return existing;
        }

        // Fetch workspace name for profile display name
        var workspace = await _db.Workspaces
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        var profileName = workspace?.Name ?? workspaceId.ToString("N");

        // Provision via Zernio API
        var provisioned = await _zernioClient.ProvisionProfileAsync(
            workspaceId: workspaceId.ToString(),
            name: profileName,
            cancellationToken: cancellationToken);

        var profile = ZernioProfile.Create(
            workspaceId: workspaceId,
            zernioProfileId: provisioned.Id,
            displayName: provisioned.Name,
            platform: "zernio");

        _db.ZernioProfiles.Add(profile);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Provisioned Zernio profile {ProfileId} for workspace {WorkspaceId}",
            provisioned.Id, workspaceId);

        return profile;
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
    string? SelectedName = null);
