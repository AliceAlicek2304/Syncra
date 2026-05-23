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
    private readonly PostsApi _postsApi;
    private readonly AnalyticsApi _analyticsApi;
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
        _postsApi = new PostsApi(config);
        _analyticsApi = new AnalyticsApi(config);
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

    public async Task<ZernioCreatePostResult> CreatePostAsync(
        ZernioCreatePostRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new CreatePostRequest
            {
                Content = request.Content,
                PublishNow = request.PublishNow,
                Platforms = request.Platforms
                    .Select(p => new CreatePostRequestPlatformsInner
                    {
                        Platform = p.Platform,
                        AccountId = p.ZernioAccountId
                    })
                    .ToList()
            };

            if (!request.PublishNow && request.ScheduledForUtc.HasValue)
            {
                sdkRequest.ScheduledFor = request.ScheduledForUtc.Value;
            }

            var response = await _postsApi.CreatePostAsync(sdkRequest, null, cancellationToken);
            var createdPost = response.Post;

            return new ZernioCreatePostResult(
                createdPost.Id,
                createdPost.Status?.ToString() ?? "scheduled",
                request.Platforms.Count);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for post creation");
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to create posts.",
                reason: "post_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { platforms = request.Platforms.Count });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error creating post");
            throw new DomainException("zernio_create_post_error", "Failed to create Zernio post", ex);
        }
    }

    public async Task RetryPostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _postsApi.RetryPostAsync(zernioPostId, cancellationToken);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered retrying post {PostId}", zernioPostId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to retry posts.",
                reason: "post_management_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { zernioPostId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error retrying post {PostId}", zernioPostId);
            throw new DomainException("zernio_retry_post_error", "Failed to retry Zernio post", ex);
        }
    }

    public async Task DeletePostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _postsApi.DeletePostAsync(zernioPostId, cancellationToken);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered deleting post {PostId}", zernioPostId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to manage posts.",
                reason: "post_management_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { zernioPostId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error deleting post {PostId}", zernioPostId);
            throw new DomainException("zernio_delete_post_error", "Failed to delete Zernio post", ex);
        }
    }

    // ── Analytics methods ────────────────────────────────────────────────────

    public async Task<ZernioBestTimeDto> GetBestTimeAsync(
        string profileId,
        string? platform = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _analyticsApi.GetBestTimeToPostAsync(
                platform: platform,
                profileId: profileId,
                accountId: null,
                source: null,
                cancellationToken);

            var slots = (response.Slots ?? [])
                .Select(s => new ZernioBestTimeSlotDto(
                    s.DayOfWeek,
                    s.Hour,
                    (double)s.AvgEngagement,
                    s.PostCount))
                .ToList();

            return new ZernioBestTimeDto(slots);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio analytics billing gate for best-time, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access best-time analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for best-time, profile {ProfileId}", profileId);
            throw new ZernioAnalyticsScopeException(
                platform ?? "unknown",
                "Additional analytics permissions are required for best-time data. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching best-time for profile {ProfileId}", profileId);
            throw new DomainException("zernio_best_time_error", "Failed to fetch best-time analytics from Zernio", ex);
        }
    }

    public async Task<ZernioDailyMetricsDto> GetDailyMetricsAsync(
        string profileId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _analyticsApi.GetDailyMetricsAsync(
                platform: null,
                profileId: profileId,
                accountId: null,
                fromDate: fromDate,
                toDate: toDate,
                source: null,
                cancellationToken);

            var dailyData = (response.DailyData ?? [])
                .Select(d => new ZernioDailyDataPointDto(
                    d.Date,
                    d.PostCount,
                    d.Metrics?.Impressions ?? 0,
                    d.Metrics?.Reach ?? 0,
                    d.Metrics?.Likes ?? 0,
                    d.Metrics?.Comments ?? 0,
                    d.Metrics?.Shares ?? 0,
                    d.Metrics?.Saves ?? 0,
                    d.Metrics?.Clicks ?? 0,
                    d.Metrics?.Views ?? 0))
                .ToList();

            var platformBreakdown = (response.PlatformBreakdown ?? [])
                .Select(p => new ZernioPlatformBreakdownDto(
                    p.Platform,
                    p.PostCount,
                    p.Impressions,
                    p.Reach,
                    p.Likes,
                    p.Comments,
                    p.Shares,
                    p.Saves,
                    p.Clicks,
                    p.Views))
                .ToList();

            return new ZernioDailyMetricsDto(dailyData, platformBreakdown.Count > 0 ? platformBreakdown : null);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio analytics billing gate triggered for profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access Zernio analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for daily metrics, profile {ProfileId}", profileId);
            throw new ZernioAnalyticsScopeException(
                "unknown",
                "Additional analytics permissions are required for daily metrics. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching daily metrics for profile {ProfileId}", profileId);
            throw new DomainException("zernio_daily_metrics_error", "Failed to fetch daily metrics from Zernio", ex);
        }
    }

    public async Task<ZernioPostAnalyticsDto> GetPostAnalyticsAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _analyticsApi.GetAnalyticsAsync(
                postId: zernioPostId,
                platform: null,
                profileId: null,
                accountId: null,
                source: null,
                fromDate: null,
                toDate: null,
                limit: null,
                page: null,
                sortBy: null,
                order: null,
                cancellationToken);

            var singlePost = response.GetAnalyticsSinglePostResponse();
            var syncPending = singlePost?.SyncStatus == Zernio.Model.AnalyticsSinglePostResponse.SyncStatusEnum.Pending;

            var postAnalytics = singlePost?.Analytics;
            var fields = postAnalytics != null
                ? new PostAnalyticsFields(
                    postAnalytics.Impressions,
                    postAnalytics.Reach,
                    postAnalytics.Likes,
                    postAnalytics.Comments,
                    postAnalytics.Shares,
                    postAnalytics.Saves,
                    postAnalytics.Clicks,
                    postAnalytics.Views,
                    postAnalytics.EngagementRate,
                    postAnalytics.LastUpdated)
                : null;

            var platformAnalytics = singlePost?.PlatformAnalytics?
                .Select(p => new ZernioPlatformPostMetricsDto(
                    p.Platform,
                    p.PlatformPostId,
                    p.AccountId,
                    p.AccountUsername,
                    p.Analytics != null
                        ? new PostAnalyticsFields(
                            p.Analytics.Impressions,
                            p.Analytics.Reach,
                            p.Analytics.Likes,
                            p.Analytics.Comments,
                            p.Analytics.Shares,
                            p.Analytics.Saves,
                            p.Analytics.Clicks,
                            p.Analytics.Views,
                            p.Analytics.EngagementRate,
                            p.Analytics.LastUpdated)
                        : null,
                    p.PlatformPostUrl,
                    p.ErrorMessage))
                .ToList();

            return new ZernioPostAnalyticsDto(
                fields ?? new PostAnalyticsFields(0, 0, 0, 0, 0, 0, 0, 0, 0, null),
                platformAnalytics?.Count > 0 ? platformAnalytics : null,
                syncPending);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio analytics billing gate for post {PostId}", zernioPostId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access Zernio post analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { zernioPostId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for post {PostId}", zernioPostId);
            throw new ZernioAnalyticsScopeException(
                "unknown",
                "Additional analytics permissions are required for post analytics. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching post analytics for {PostId}", zernioPostId);
            throw new DomainException("zernio_post_analytics_error", "Failed to fetch post analytics from Zernio", ex);
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
