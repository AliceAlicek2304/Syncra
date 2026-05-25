using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Inbox;
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
    private readonly MessagesApi _messagesApi;
    private readonly CommentsApi _commentsApi;
    private readonly ReviewsApi _reviewsApi;
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
        _messagesApi = new MessagesApi(config);
        _commentsApi = new CommentsApi(config);
        _reviewsApi = new ReviewsApi(config);
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

    public async Task<ZernioAccountHealthDto> GetAccountHealthAsync(
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _accountsApi.GetAccountHealthAsync(accountId, cancellationToken);

            var posting = (response.Permissions?.Posting ?? [])
                .Select(s => new ZernioScopeDto(
                    s.Scope,
                    s.Granted,
                    s.Required))
                .ToList();

            var analytics = (response.Permissions?.Analytics ?? [])
                .Select(s => new ZernioScopeDto(
                    s.Scope,
                    s.Granted,
                    s.Required))
                .ToList();

            var optional = (response.Permissions?.Optional ?? [])
                .Select(s => new ZernioScopeDto(
                    s.Scope,
                    s.Granted,
                    s.Required))
                .ToList();

            return new ZernioAccountHealthDto(
                AccountId: response.AccountId,
                Platform: response.Platform,
                Username: response.Username,
                DisplayName: response.DisplayName,
                Status: response.Status?.ToString() ?? "error",
                TokenStatus: new ZernioTokenStatusDto(
                    response.TokenStatus?.Valid ?? false,
                    response.TokenStatus?.ExpiresAt,
                    response.TokenStatus?.ExpiresIn,
                    response.TokenStatus?.NeedsRefresh ?? false),
                Permissions: new ZernioHealthPermissionsDto(
                    posting,
                    analytics,
                    optional,
                    response.Permissions?.CanPost ?? false,
                    response.Permissions?.CanFetchAnalytics ?? false,
                    response.Permissions?.MissingRequired ?? []),
                Issues: response.Issues ?? [],
                Recommendations: response.Recommendations ?? []);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for account health {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access account health details.",
                reason: "health_check_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error getting account health for {AccountId}", accountId);
            throw new DomainException("zernio_health_error", "Failed to get account health from Zernio", ex);
        }
    }

    public async Task<ZernioProfileDto> GetProfileAsync(
        string profileId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _profilesApi.GetProfileAsync(profileId, cancellationToken);
            return new ZernioProfileDto(response.Profile.Id, response.Profile.Name);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio profile {ProfileId} not found", profileId);
            throw new DomainException("zernio_profile_not_found", $"Zernio profile {profileId} not found.", ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error getting profile {ProfileId}", profileId);
            throw new DomainException("zernio_get_profile_error", "Failed to get Zernio profile", ex);
        }
    }

    public async Task<ZernioProfileDto> UpdateProfileAsync(
        string profileId,
        string name,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new UpdateProfileRequest(name: name);
            var response = await _profilesApi.UpdateProfileAsync(profileId, request, cancellationToken);
            return new ZernioProfileDto(response.Profile.Id, response.Profile.Name);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio profile {ProfileId} not found for update", profileId);
            throw new DomainException("zernio_profile_not_found", $"Zernio profile {profileId} not found.", ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error updating profile {ProfileId}", profileId);
            throw new DomainException("zernio_update_profile_error", "Failed to update Zernio profile", ex);
        }
    }

    public async Task DeleteProfileAsync(
        string profileId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _profilesApi.DeleteProfileAsync(profileId, cancellationToken);
            _logger.LogInformation("Deleted Zernio profile {ProfileId}", profileId);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio profile {ProfileId} already deleted or not found", profileId);
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio profile {ProfileId} has connected accounts — cannot delete", profileId);
            throw new DomainException("zernio_profile_has_accounts",
                "Cannot delete profile with connected social accounts. Disconnect them first.", ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error deleting profile {ProfileId}", profileId);
            throw new DomainException("zernio_delete_profile_error", "Failed to delete Zernio profile", ex);
        }
    }

    public async Task<ZernioProfileDto> ProvisionProfileAsync(
        string workspaceId,
        string name,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new CreateProfileRequest(
                name: name,
                description: workspaceId,
                color: null
            );

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

    public async Task<IReadOnlyList<ZernioProfileDto>> ListProfilesAsync(
        bool? includeOverLimit = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _profilesApi.ListProfilesAsync(
                includeOverLimit,
                cancellationToken);

            return response.Profiles
                .Select(p => new ZernioProfileDto(p.Id, p.Name))
                .ToList();
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing profiles");
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to list profiles.",
                reason: "profile_list_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { includeOverLimit });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing profiles");
            throw new DomainException("zernio_list_profiles_error", "Failed to list Zernio profiles", ex);
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

    // ── Facebook Page methods ─────────────────────────────────────────────────

    public async Task<ZernioFacebookPagesResponseDto> GetFacebookPagesAsync(
        string accountId,
        bool? refresh = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _connectApi.GetFacebookPagesAsync(
                accountId,
                refresh,
                cancellationToken);

            var pages = response.Pages
                .Select(p => new ZernioFacebookPageDto(
                    p.Id,
                    p.Name,
                    p.Username,
                    p.Category,
                    p.FanCount))
                .ToList();

            return new ZernioFacebookPagesResponseDto(
                pages,
                response.SelectedPageId,
                response.Cached);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing pages for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to manage Facebook pages.",
                reason: "facebook_pages_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing Facebook pages for account {AccountId}", accountId);
            throw new DomainException("zernio_facebook_pages_error", "Failed to list Facebook pages", ex);
        }
    }

    public async Task UpdateFacebookPageAsync(
        string accountId,
        string selectedPageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new UpdateFacebookPageRequest(selectedPageId);
            await _connectApi.UpdateFacebookPageAsync(accountId, request, cancellationToken);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered switching page for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to switch Facebook pages.",
                reason: "facebook_page_switch_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error switching Facebook page for account {AccountId}", accountId);
            throw new DomainException("zernio_facebook_page_switch_error", "Failed to switch Facebook page", ex);
        }
    }

    // ── Inbox DM methods ────────────────────────────────────────────────────

    public async Task<ZernioInboxConversationsPageDto> ListInboxConversationsAsync(
        string profileId,
        string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesApi.ListInboxConversationsAsync(
                profileId,
                platform: null,
                status: null,
                sortOrder: null,
                limit: null,
                cursor: cursor,
                accountId: null,
                cancellationToken);

            var items = (response.Data ?? [])
                .Select(c => new ZernioInboxConversationItemDto(
                    c.Id,
                    c.Platform ?? string.Empty,
                    c.ParticipantName,
                    c.AccountUsername,
                    c.ParticipantPicture,
                    c.LastMessage,
                    c.UpdatedTime,
                    c.Status?.ToString()))
                .ToList();

            return new ZernioInboxConversationsPageDto(
                items,
                response.Pagination?.HasMore ?? false,
                response.Pagination?.NextCursor);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for list conversations, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to access inbox conversations.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing inbox conversations for profile {ProfileId}", profileId);
            throw new DomainException("zernio_inbox_list_error", "Failed to list inbox conversations from Zernio", ex);
        }
    }

    public async Task<ZernioInboxMessagesPageDto> ListInboxMessagesAsync(
        string conversationId,
        string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesApi.GetInboxConversationMessagesAsync(
                conversationId,
                accountId: null,
                limit: null,
                cursor: cursor,
                sortOrder: null,
                cancellationToken);

            var items = (response.Messages ?? [])
                .Select(m => new ZernioInboxMessageItemDto(
                    m.Id,
                    m.Message,
                    m.Direction?.ToString(),
                    m.CreatedAt,
                    null,
                    m.ReadAt != default))
                .ToList();

            return new ZernioInboxMessagesPageDto(
                items,
                response.Pagination?.HasMore ?? false,
                response.Pagination?.NextCursor);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for list messages, conversation {ConversationId}", conversationId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to access inbox messages.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing inbox messages for conversation {ConversationId}", conversationId);
            throw new DomainException("zernio_inbox_messages_error", "Failed to list inbox messages from Zernio", ex);
        }
    }

    public async Task<ZernioSendMessageResponseDto> SendInboxMessageAsync(
        string profileId,
        string conversationId,
        string accountId,
        string text,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new SendInboxMessageRequest
            {
                AccountId = accountId,
                Message = text
            };

            var response = await _messagesApi.SendInboxMessageAsync(
                conversationId,
                sdkRequest,
                cancellationToken);

            return new ZernioSendMessageResponseDto(
                response.Data?.MessageId ?? string.Empty,
                response.Data?.SentAt ?? DateTime.UtcNow);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for send message, conversation {ConversationId}", conversationId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to send inbox messages.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error sending inbox message to conversation {ConversationId}", conversationId);
            throw new DomainException("zernio_inbox_send_error", "Failed to send inbox message via Zernio", ex);
        }
    }

    // ── Inbox Comment methods ───────────────────────────────────────────────

    public async Task<ZernioInboxCommentsPageDto> ListInboxCommentsAsync(
        string profileId,
        DateTime? since = null,
        string? cursor = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _commentsApi.ListInboxCommentsAsync(
                profileId,
                platform: platform,
                minComments: null,
                since: since,
                sortBy: null,
                sortOrder: null,
                limit: null,
                cursor: cursor,
                accountId: accountId,
                cancellationToken);

            var items = (response.Data ?? [])
                .Select(c => new ZernioInboxCommentItemDto(
                    c.Id,
                    c.Platform ?? string.Empty,
                    c.Content ?? string.Empty,
                    c.Picture,
                    c.Permalink,
                    c.CreatedTime,
                    c.CommentCount,
                    c.Cid))
                .ToList();

            return new ZernioInboxCommentsPageDto(
                items,
                response.Pagination?.HasMore ?? false,
                response.Pagination?.NextCursor);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for list comments, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to access inbox comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing inbox comments for profile {ProfileId}", profileId);
            throw new DomainException("zernio_inbox_comments_error", "Failed to list inbox comments from Zernio", ex);
        }
    }

    public async Task<ZernioReplyToCommentResponseDto> ReplyToInboxCommentAsync(
        string profileId,
        string zernioPostId,
        string accountId,
        string message,
        string? commentId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new ReplyToInboxPostRequest
            {
                AccountId = accountId,
                Message = message,
                CommentId = commentId
            };

            var response = await _commentsApi.ReplyToInboxPostAsync(
                zernioPostId,
                sdkRequest,
                cancellationToken);

            return new ZernioReplyToCommentResponseDto(
                response.Data?.CommentId ?? string.Empty,
                response.Data?.Cid);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for reply to comment, post {PostId}", zernioPostId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to reply to comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { zernioPostId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error replying to comment on post {PostId}", zernioPostId);
            throw new DomainException("zernio_inbox_reply_error", "Failed to reply to comment via Zernio", ex);
        }
    }

    // ── Inbox Review methods ────────────────────────────────────────────────

    public async Task<ZernioInboxReviewsPageDto> ListInboxReviewsAsync(
        string profileId,
        string? cursor = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _reviewsApi.ListInboxReviewsAsync(
                profileId,
                platform: platform,
                minRating: null,
                maxRating: null,
                hasReply: null,
                sortBy: null,
                sortOrder: null,
                limit: null,
                cursor: cursor,
                accountId: accountId,
                cancellationToken);

            var items = (response.Data ?? [])
                .Select(r => new ZernioInboxReviewItemDto(
                    r.Id,
                    r.Platform ?? string.Empty,
                    r.AccountId,
                    r.AccountUsername,
                    r.Reviewer?.Name,
                    r.Reviewer?.ProfileImage,
                    r.Rating,
                    r.Text,
                    r.Created,
                    r.HasReply,
                    r.Reply?.Text,
                    r.Reply?.Created))
                .ToList();

            return new ZernioInboxReviewsPageDto(
                items,
                response.Pagination?.HasMore ?? false,
                response.Pagination?.NextCursor);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for list reviews, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to access reviews.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing inbox reviews for profile {ProfileId}", profileId);
            throw new DomainException("zernio_inbox_reviews_error", "Failed to list inbox reviews from Zernio", ex);
        }
    }

    public async Task<ZernioReplyToReviewResponseDto> ReplyToInboxReviewAsync(
        string profileId,
        string reviewId,
        string accountId,
        string message,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new ReplyToInboxReviewRequest
            {
                AccountId = accountId,
                Message = message
            };

            var response = await _reviewsApi.ReplyToInboxReviewAsync(
                reviewId,
                sdkRequest,
                cancellationToken);

            return new ZernioReplyToReviewResponseDto(
                response.Reply?.Id ?? string.Empty,
                response.Reply?.Text ?? string.Empty,
                response.Reply?.Created ?? DateTime.UtcNow);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for reply to review {ReviewId}", reviewId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to reply to reviews.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { reviewId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error replying to review {ReviewId}", reviewId);
            throw new DomainException("zernio_inbox_reply_error", "Failed to reply to review via Zernio", ex);
        }
    }

    // ── Follower Stats methods ──────────────────────────────────────────────

    public async Task<ZernioFollowerStatsResponseDto> GetFollowerStatsAsync(
        string accountIds,
        string profileId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? granularity = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _accountsApi.GetFollowerStatsAsync(
                accountIds,
                profileId,
                fromDate.HasValue ? DateOnly.FromDateTime(fromDate.Value) : null,
                toDate.HasValue ? DateOnly.FromDateTime(toDate.Value) : null,
                granularity,
                cancellationToken);

            var accounts = (response.Accounts ?? [])
                .Select(a => new ZernioFollowerStatsAccountDto(
                    a.Id,
                    a.Platform.ToString(),
                    a.Username,
                    a.DisplayName,
                    a.ProfilePicture,
                    (long)a.CurrentFollowers,
                    a.LastUpdated,
                    a.Growth,
                    a.GrowthPercentage,
                    (int)a.DataPoints))
                .ToList();

            var stats = response.Stats?
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => (IReadOnlyList<ZernioFollowerStatsDataPointDto>)kvp.Value
                        .Select(d => new ZernioFollowerStatsDataPointDto(d.Date, d.Followers))
                        .ToList());

            return new ZernioFollowerStatsResponseDto(
                accounts,
                stats,
                response.DateRange?.From,
                response.DateRange?.To,
                response.Granularity);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for follower stats, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access follower stats.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching follower stats for profile {ProfileId}", profileId);
            throw new DomainException("zernio_follower_stats_error", "Failed to fetch follower stats from Zernio", ex);
        }
    }

    // ── Bulk Account Health methods ─────────────────────────────────────────

    public async Task<ZernioBulkHealthResponseDto> GetAllAccountsHealthAsync(
        string profileId,
        string? platform = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _accountsApi.GetAllAccountsHealthAsync(
                profileId,
                platform,
                status,
                cancellationToken);

            var summary = new ZernioBulkHealthSummaryDto(
                response.Summary.Total,
                response.Summary.Healthy,
                response.Summary.Warning,
                response.Summary.Error,
                response.Summary.NeedsReconnect);

            var accounts = (response.Accounts ?? [])
                .Select(a => new ZernioBulkHealthItemDto(
                    a.AccountId,
                    a.Platform,
                    a.Username,
                    a.DisplayName,
                    a.Status?.ToString(),
                    a.CanPost,
                    a.CanFetchAnalytics,
                    a.TokenValid,
                    a.TokenExpiresAt,
                    a.NeedsReconnect,
                    a.Issues ?? []))
                .ToList();

            return new ZernioBulkHealthResponseDto(summary, accounts);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for bulk health, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to check account health.",
                reason: "health_check_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching bulk health for profile {ProfileId}", profileId);
            throw new DomainException("zernio_bulk_health_error", "Failed to fetch bulk account health from Zernio", ex);
        }
    }

    // ── Account Update methods ──────────────────────────────────────────────

    public async Task<ZernioUpdateAccountResponseDto> UpdateAccountAsync(
        string accountId,
        ZernioUpdateAccountRequestDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new UpdateAccountRequest
            {
                Username = request.Username,
                DisplayName = request.DisplayName,
                XCapabilities = request.EnableAnalytics.HasValue || request.EnableInbox.HasValue
                    ? new UpdateAccountRequestXCapabilities
                    {
                        Analytics = request.EnableAnalytics ?? false,
                        Inbox = request.EnableInbox ?? false
                    }
                    : null
            };

            var response = await _accountsApi.UpdateAccountAsync(accountId, sdkRequest, cancellationToken);

            return new ZernioUpdateAccountResponseDto(
                response.Message,
                response.Username,
                response.DisplayName);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered updating account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to update account settings.",
                reason: "account_update_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account {AccountId} not found for update", accountId);
            throw new DomainException("zernio_account_not_found", $"Zernio account {accountId} not found.", ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error updating account {AccountId}", accountId);
            throw new DomainException("zernio_update_account_error", "Failed to update Zernio account", ex);
        }
    }

    // ── Move Account methods ────────────────────────────────────────────────

    public async Task<ZernioMoveAccountResponseDto> MoveAccountToProfileAsync(
        string accountId,
        string targetProfileId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new MoveAccountToProfileRequest(profileId: targetProfileId);
            var response = await _accountsApi.MoveAccountToProfileAsync(accountId, sdkRequest, cancellationToken);

            return new ZernioMoveAccountResponseDto(
                response.Message,
                response.ProfileId);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered moving account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to move accounts between profiles.",
                reason: "account_move_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account {AccountId} or target profile not found for move", accountId);
            throw new DomainException("zernio_account_not_found", $"Zernio account or target profile not found.", ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error moving account {AccountId}", accountId);
            throw new DomainException("zernio_move_account_error", "Failed to move Zernio account", ex);
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
        var request = new SelectFacebookPageRequest(
            profileId: profileId,
            pageId: pageId,
            tempToken: tempToken,
            userProfile: new SelectFacebookPageRequestUserProfile(
                id: "dummy",
                name: "dummy",
                profilePicture: "https://dummy.com"
            )
        );
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
        var request = new SelectLinkedInOrganizationRequest(
            profileId: profileId,
            tempToken: tempToken,
            selectedOrganization: new { id = organizationId }
        );
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
        var request = new SelectGoogleBusinessLocationRequest(
            profileId: profileId,
            locationId: locationId,
            pendingDataToken: tempToken
        );
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
        var request = new SelectPinterestBoardRequest(
            profileId: profileId,
            boardId: boardId,
            boardName: boardName,
            tempToken: tempToken
        );
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
        var request = new SelectSnapchatProfileRequest(
            profileId: profileId,
            selectedPublicProfile: new SelectSnapchatProfileRequestSelectedPublicProfile
            {
                Id = publicProfileId
            },
            tempToken: tempToken
        );
        var response = await _connectApi.SelectSnapchatProfileAsync(request, xConnectToken: null, cancellationToken);
        return new ZernioSelectResultDto(
            response.Account.AccountId,
            response.Account.Platform.ToString(),
            response.Account.DisplayName,
            response.Account.ProfilePicture);
    }
}
