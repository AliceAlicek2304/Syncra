using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/connect")]
public sealed class ConnectController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<ConnectController> _logger;

    public ConnectController(
        AppDbContext db,
        IZernioClient zernioClient,
        ILogger<ConnectController> logger)
    {
        _db = db;
        _zernioClient = zernioClient;
        _logger = logger;
    }

    [HttpGet("facebook/select-page")]
    public async Task<IActionResult> ListFacebookPages(
        [FromQuery] string profileId,
        [FromQuery] string tempToken,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        try
        {
            var result = await _zernioClient.GetFacebookConnectPagesAsync(profileId, tempToken, cancellationToken);
            return Ok(result);
        }
        catch (DomainException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("facebook/select-page")]
    public async Task<IActionResult> SelectFacebookPage(
        [FromBody] ZernioFacebookConnectSelectRequest request,
        CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[Middleware.TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });
        }

        try
        {
            // Call Zernio API to complete selection
            var selectResponse = await _zernioClient.SelectFacebookConnectPageAsync(request, cancellationToken);

            // Try to get explicit ProfileId from context (set by ProfileResolutionMiddleware)
            var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
            ZernioProfile? zernioProfile = null;

            if (explicitProfileId != null)
            {
                zernioProfile = await _db.ZernioProfiles
                    .FirstOrDefaultAsync(p => p.Id == explicitProfileId && p.WorkspaceId == workspaceId.Value && p.IsActive, cancellationToken);
            }

            if (zernioProfile is null)
            {
                zernioProfile = await _db.ZernioProfiles
                    .FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId.Value && p.IsActive, cancellationToken);
            }

            if (zernioProfile is null)
            {
                return NotFound(new { code = "not_found", message = "Zernio profile not found for this workspace." });
            }

            var accountDetail = selectResponse.Account;

            // Create or reactivate local SocialAccount
            var existing = await _db.SocialAccounts
                .FirstOrDefaultAsync(sa =>
                    sa.WorkspaceId == workspaceId.Value &&
                    sa.ExternalAccountId == accountDetail.AccountId &&
                    sa.Platform == "facebook",
                    cancellationToken);

            if (existing is not null)
            {
                existing.UpdateProfile(zernioProfile.Id);

                if (!existing.IsActive)
                {
                    existing.Reactivate();
                    existing.Update(accountDetail.DisplayName, accountDetail.ProfilePicture);
                }
                else
                {
                    existing.Update(accountDetail.DisplayName, accountDetail.ProfilePicture);
                }

                _logger.LogInformation(
                    "Reactivated existing Facebook SocialAccount {AccountId} for workspace {WorkspaceId}",
                    existing.Id, workspaceId.Value);
            }
            else
            {
                var newAccount = SocialAccount.Create(
                    workspaceId: workspaceId.Value,
                    zernioProfileId: zernioProfile.Id,
                    externalAccountId: accountDetail.AccountId,
                    platform: "facebook",
                    displayName: accountDetail.DisplayName,
                    avatarUrl: accountDetail.ProfilePicture);

                _db.SocialAccounts.Add(newAccount);
                existing = newAccount;

                _logger.LogInformation(
                    "Created Facebook SocialAccount {ExternalId} for workspace {WorkspaceId}",
                    accountDetail.AccountId, workspaceId.Value);
            }

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                message = selectResponse.Message,
                redirect_url = selectResponse.RedirectUrl,
                account = new
                {
                    accountId = existing.Id,
                    platform = existing.Platform,
                    username = accountDetail.Username ?? existing.DisplayName,
                    displayName = existing.DisplayName,
                    profilePicture = existing.AvatarUrl,
                    isActive = existing.IsActive,
                    selectedPageName = existing.DisplayName
                }
            });
        }
        catch (DomainException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
