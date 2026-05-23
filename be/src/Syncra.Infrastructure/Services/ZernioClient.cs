using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Zernio.Api;
using Zernio.Client;
using Zernio.Model;

namespace Syncra.Infrastructure.Services;

public sealed class ZernioClient : IZernioClient
{
    private readonly ConnectApi _connectApi;
    private readonly AccountsApi _accountsApi;
    private readonly ProfilesApi _profilesApi;
    private readonly ILogger<ZernioClient> _logger;

    public ZernioClient(
        IOptions<ZernioOptions> options,
        ILogger<ZernioClient> logger)
    {
        var config = new Configuration
        {
            AccessToken = options.Value.ApiKey
        };

        _connectApi = new ConnectApi(config);
        _accountsApi = new AccountsApi(config);
        _profilesApi = new ProfilesApi(config);
        _logger = logger;
    }

    public async Task<ZernioConnectUrlResult> GetConnectUrlAsync(
        string profileId,
        string platform,
        string redirectUrl,
        bool? headless = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _connectApi.GetConnectUrlAsync(
                platform,
                profileId,
                redirectUrl,
                headless: headless,
                cancellationToken);

            return new ZernioConnectUrlResult(response.AuthUrl);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for platform {Platform}, profile {ProfileId}", platform, profileId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to connect this platform.",
                reason: "platform_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { platform, profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error getting connect URL for profile {ProfileId}", profileId);
            throw new DomainException("zernio_connect_error", "Failed to get connect URL from Zernio", ex);
        }
    }

    public async Task<IReadOnlyList<ZernioAccountDto>> ListAccountsAsync(
        string profileId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _accountsApi.ListAccountsAsync(
                profileId,
                platform: null,
                includeOverLimit: null,
                page: null,
                limit: null,
                cancellationToken);

            return response.Accounts
                .Select(a => new ZernioAccountDto(
                    a.Id,
                    a.Platform.ToString(),
                    a.DisplayName,
                    a.IsActive))
                .ToList();
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing accounts for profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to list connected accounts.",
                reason: "account_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing accounts for profile {ProfileId}", profileId);
            throw new DomainException("zernio_list_accounts_error", "Failed to list Zernio accounts", ex);
        }
    }

    public async Task DisconnectAccountAsync(
        string profileId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _accountsApi.DeleteAccountAsync(accountId, cancellationToken);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered disconnecting account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to manage account connections.",
                reason: "account_management_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error disconnecting account {AccountId}", accountId);
            throw new DomainException("zernio_disconnect_error", "Failed to disconnect Zernio account", ex);
        }
    }

    public async Task<ZernioProfileDto> ProvisionProfileAsync(
        string workspaceId,
        string name,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new CreateProfileRequest
            {
                Name = name,
                Description = workspaceId
            };

            var response = await _profilesApi.CreateProfileAsync(request, cancellationToken);

            return new ZernioProfileDto(response.Profile.Id, response.Profile.Name);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered provisioning profile for workspace {WorkspaceId}", workspaceId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to provision additional profiles.",
                reason: "profile_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { workspaceId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error provisioning profile for workspace {WorkspaceId}", workspaceId);
            throw new DomainException("zernio_provision_error", "Failed to provision Zernio profile", ex);
        }
    }

    public async Task<IReadOnlyList<ZernioSelectOptionDto>> ListSelectOptionsAsync(
        string profileId,
        string platform,
        string tempToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var normalizedPlatform = platform.ToLowerInvariant();

            return normalizedPlatform switch
            {
                "facebook" => await ListFacebookPagesAsync(profileId, tempToken, cancellationToken),
                "linkedin" => await ListLinkedInOrganizationsAsync(profileId, tempToken, cancellationToken),
                "googlebusiness" => await ListGoogleBusinessLocationsAsync(profileId, tempToken, cancellationToken),
                "pinterest" => await ListPinterestBoardsAsync(profileId, tempToken, cancellationToken),
                "snapchat" => await ListSnapchatProfilesAsync(profileId, tempToken, cancellationToken),
                _ => Array.Empty<ZernioSelectOptionDto>()
            };
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing options for platform {Platform}", platform);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to list available accounts for this platform.",
                reason: "platform_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { platform, profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing select options for platform {Platform}, profile {ProfileId}", platform, profileId);
            throw new DomainException("zernio_list_options_error", $"Failed to list available options for {platform}", ex);
        }
    }

    public async Task<ZernioSelectResultDto> SelectOptionAsync(
        string profileId,
        string platform,
        string tempToken,
        string selectedId,
        string? selectedName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var normalizedPlatform = platform.ToLowerInvariant();

            return normalizedPlatform switch
            {
                "facebook" => await SelectFacebookPageAsync(profileId, tempToken, selectedId, cancellationToken),
                "linkedin" => await SelectLinkedInOrganizationAsync(profileId, tempToken, selectedId, cancellationToken),
                "googlebusiness" => await SelectGoogleBusinessLocationAsync(profileId, tempToken, selectedId, cancellationToken),
                "pinterest" => await SelectPinterestBoardAsync(profileId, tempToken, selectedId, selectedName, cancellationToken),
                "snapchat" => await SelectSnapchatProfileAsync(profileId, tempToken, selectedId, cancellationToken),
                _ => throw new DomainException("unsupported_platform", $"Platform '{platform}' does not support headless selection.")
            };
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (DomainException)
        {
            throw;
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered selecting option for platform {Platform}", platform);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to connect this platform.",
                reason: "platform_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { platform, profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error selecting option for platform {Platform}, profile {ProfileId}", platform, profileId);
            throw new DomainException("zernio_select_error", $"Failed to complete selection for {platform}", ex);
        }
    }

    // ── Private platform-specific list helpers ───────────────────────────────

    private async Task<IReadOnlyList<ZernioSelectOptionDto>> ListFacebookPagesAsync(
        string profileId, string tempToken, CancellationToken cancellationToken)
    {
        var response = await _connectApi.ListFacebookPagesAsync(profileId, tempToken, cancellationToken);
        return (response.Pages ?? [])
            .Select(p => new ZernioSelectOptionDto(p.Id, p.Name))
            .ToList();
    }

    private async Task<IReadOnlyList<ZernioSelectOptionDto>> ListLinkedInOrganizationsAsync(
        string profileId, string tempToken, CancellationToken cancellationToken)
    {
        var response = await _connectApi.ListLinkedInOrganizationsAsync(tempToken, orgIds: null, cancellationToken);
        return (response.Organizations ?? [])
            .Select(o => new ZernioSelectOptionDto(o.Id, o.VanityName ?? o.Id, o.LogoUrl))
            .ToList();
    }

    private async Task<IReadOnlyList<ZernioSelectOptionDto>> ListGoogleBusinessLocationsAsync(
        string profileId, string tempToken, CancellationToken cancellationToken)
    {
        var response = await _connectApi.ListGoogleBusinessLocationsAsync(profileId, tempToken, null, cancellationToken);
        return (response.Locations ?? [])
            .Select(l => new ZernioSelectOptionDto(l.Id, l.Name))
            .ToList();
    }

    private async Task<IReadOnlyList<ZernioSelectOptionDto>> ListPinterestBoardsAsync(
        string profileId, string tempToken, CancellationToken cancellationToken)
    {
        var response = await _connectApi.ListPinterestBoardsForSelectionAsync(null, profileId, tempToken, cancellationToken);
        return (response.Boards ?? [])
            .Select(b => new ZernioSelectOptionDto(b.Id, b.Name))
            .ToList();
    }

    private async Task<IReadOnlyList<ZernioSelectOptionDto>> ListSnapchatProfilesAsync(
        string profileId, string tempToken, CancellationToken cancellationToken)
    {
        var response = await _connectApi.ListSnapchatProfilesAsync(null, profileId, tempToken, cancellationToken);
        return (response.PublicProfiles ?? [])
            .Select(p => new ZernioSelectOptionDto(p.Id, p.DisplayName ?? p.Username, p.ProfileImageUrl))
            .ToList();
    }

    // ── Private platform-specific select helpers ─────────────────────────────

    private async Task<ZernioSelectResultDto> SelectFacebookPageAsync(
        string profileId, string tempToken, string pageId, CancellationToken cancellationToken)
    {
        var request = new SelectFacebookPageRequest
        {
            ProfileId = profileId,
            PageId = pageId,
            TempToken = tempToken
        };
        var response = await _connectApi.SelectFacebookPageAsync(request, cancellationToken);
        return new ZernioSelectResultDto(
            response.Account.AccountId,
            response.Account.Platform.ToString(),
            response.Account.DisplayName,
            response.Account.ProfilePicture);
    }

    private async Task<ZernioSelectResultDto> SelectLinkedInOrganizationAsync(
        string profileId, string tempToken, string organizationId, CancellationToken cancellationToken)
    {
        var request = new SelectLinkedInOrganizationRequest
        {
            ProfileId = profileId,
            TempToken = tempToken,
            SelectedOrganization = new { id = organizationId }
        };
        var response = await _connectApi.SelectLinkedInOrganizationAsync(request, cancellationToken);
        return new ZernioSelectResultDto(
            response.Account.AccountId,
            response.Account.Platform.ToString(),
            response.Account.DisplayName,
            response.Account.ProfilePicture);
    }

    private async Task<ZernioSelectResultDto> SelectGoogleBusinessLocationAsync(
        string profileId, string tempToken, string locationId, CancellationToken cancellationToken)
    {
        var request = new SelectGoogleBusinessLocationRequest
        {
            ProfileId = profileId,
            LocationId = locationId,
            PendingDataToken = tempToken
        };
        var response = await _connectApi.SelectGoogleBusinessLocationAsync(request, cancellationToken);
        return new ZernioSelectResultDto(
            response.Account.AccountId,
            response.Account.Platform.ToString(),
            response.Account.DisplayName,
            ProfilePicture: null);
    }

    private async Task<ZernioSelectResultDto> SelectPinterestBoardAsync(
        string profileId, string tempToken, string boardId, string? boardName, CancellationToken cancellationToken)
    {
        var request = new SelectPinterestBoardRequest
        {
            ProfileId = profileId,
            BoardId = boardId,
            BoardName = boardName,
            TempToken = tempToken
        };
        var response = await _connectApi.SelectPinterestBoardAsync(request, cancellationToken);
        return new ZernioSelectResultDto(
            response.Account.AccountId,
            response.Account.Platform.ToString(),
            response.Account.DisplayName,
            response.Account.ProfilePicture);
    }

    private async Task<ZernioSelectResultDto> SelectSnapchatProfileAsync(
        string profileId, string tempToken, string publicProfileId, CancellationToken cancellationToken)
    {
        var request = new SelectSnapchatProfileRequest
        {
            ProfileId = profileId,
            SelectedPublicProfile = new SelectSnapchatProfileRequestSelectedPublicProfile
            {
                Id = publicProfileId
            },
            TempToken = tempToken
        };
        var response = await _connectApi.SelectSnapchatProfileAsync(request, xConnectToken: null, cancellationToken);
        return new ZernioSelectResultDto(
            response.Account.AccountId,
            response.Account.Platform.ToString(),
            response.Account.DisplayName,
            response.Account.ProfilePicture);
    }
}
