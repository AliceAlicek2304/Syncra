using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
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
    private readonly MediaApi _mediaApi;
    private readonly LinkedInMentionsApi _linkedInMentionsApi;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ZernioClient> _logger;
    private readonly ZernioOptions _options;

    // Cache to prevent duplicate GetPendingOAuthData calls in React StrictMode/parallel requests
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (DateTime Expiry, Zernio.Model.GetPendingOAuthData200Response Data)> _pendingDataCache = new();

    public ZernioClient(
        IOptions<ZernioOptions> options,
        IHttpClientFactory httpClientFactory,
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
        _mediaApi = new MediaApi(config);
        _linkedInMentionsApi = new LinkedInMentionsApi(config);
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _options = options.Value;
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

    public async Task<ZernioListAccountsResponseDto> ListAccountsAsync(
        string profileId,
        string? platform = null,
        bool? includeOverLimit = true,
        int? page = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _accountsApi.ListAccountsAsync(
                profileId,
                platform: platform,
                includeOverLimit: includeOverLimit,
                page: page,
                limit: limit,
                cancellationToken);

            var accounts = response.Accounts
                .Select(a => new ZernioAccountDto(
                    a.Id,
                    a.Platform.ToString(),
                    a.DisplayName,
                    a.IsActive,
                    a.ProfilePicture,
                    a.ProfileUrl,
                    a.Username,
                    NormalizeMetadata(a.Metadata),
                    a.ProfileId?.ToString(),
                    (long?)a.FollowersCount,
                    a.FollowersLastUpdated,
                    a.ParentAccountId,
                    a.Enabled))
                .ToList();

            ZernioListAccountsPaginationDto? pagination = response.Pagination != null
                ? new ZernioListAccountsPaginationDto(
                    response.Pagination.Page,
                    response.Pagination.Limit,
                    response.Pagination.Total,
                    response.Pagination.Pages)
                : null;

            return new ZernioListAccountsResponseDto(accounts, response.HasAnalyticsAccess, pagination);
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
        string? userProfile = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var normalizedPlatform = platform.ToLowerInvariant();

            return normalizedPlatform switch
            {
                "facebook" => await ListFacebookPagesAsync(profileId, tempToken, cancellationToken),
                "linkedin" => await ListLinkedInOrganizationsAsync(profileId, tempToken, userProfile, cancellationToken),
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
        object? userProfile = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var normalizedPlatform = platform.ToLowerInvariant();

            return normalizedPlatform switch
            {
                "facebook" => await SelectFacebookPageAsync(profileId, tempToken, selectedId, selectedName, cancellationToken),
                "linkedin" => await SelectLinkedInOrganizationAsync(profileId, tempToken, selectedId, userProfile, cancellationToken),
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

    public async Task<ZernioTikTokCreatorInfoDto> GetTikTokCreatorInfoAsync(
        string accountId,
        string? mediaType = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _accountsApi.GetTikTokCreatorInfoAsync(accountId, mediaType, cancellationToken);

            return new ZernioTikTokCreatorInfoDto(
                CreatorInfo: new ZernioTikTokCreatorInfoDetails(
                    PrivacyLevelOptions: response.PrivacyLevels?.Select(x => x.Value ?? x.Label).ToList(),
                    CommentDisabled: null,
                    DuetDisabled: null,
                    StitchDisabled: null,
                    MaxVideoPostDurationSec: response.PostingLimits?.MaxVideoDurationSec,
                    CommercialContentTypeOptions: response.CommercialContentTypes?.Select(x => x.Value ?? x.Label).ToList()
                )
            );
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered fetching TikTok creator info for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to fetch TikTok creator info.",
                reason: "api_limit_reached",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching TikTok creator info for account {AccountId}", accountId);
            throw new DomainException("zernio_tiktok_creator_info_error", $"Failed to fetch TikTok creator info", ex);
        }
    }

    // ── CreatePostAsync: Raw HTTP request to bypass SDK oneOf deserialization ──────
    public async Task<ZernioCreatePostResult> CreatePostAsync(
        ZernioCreatePostRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(request.PostId))
        {
            throw new DomainException("invalid_create_post_request", "PostId is set. Use UpdatePostAsync to update existing posts.");
        }

        try
        {
            var sdkRequest = ToSdkCreatePostRequest(request);
            var config = _postsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/posts");
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            var jsonBody = System.Text.Json.JsonSerializer.Serialize(sdkRequest, _jsonOptions);
            httpRequest.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 402)
                {
                    _logger.LogWarning("Zernio billing gate triggered saving post. Content: {Content}", errorContent);
                    throw new ZernioBillingRequiredException(
                        "A paid Zernio plan is required to save posts.",
                        reason: "post_limit_reached",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { platforms = request.Platforms.Count });
                }

                _logger.LogError("Zernio API error saving post. Status: {StatusCode}, Error: {Error}", httpResponse.StatusCode, errorContent);
                throw new DomainException("zernio_save_post_error", $"Failed to save Zernio post. Status: {httpResponse.StatusCode}. Error: {errorContent}");
            }

            var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var rawResponse = System.Text.Json.JsonSerializer.Deserialize<ZernioRawCreatePostResponse>(responseJson, _jsonOptions);

            var resultId = rawResponse?.Post?._Id ?? request.PostId ?? string.Empty;
            var resultStatus = rawResponse?.Post?.Status ?? request.Status ?? "scheduled";

            return new ZernioCreatePostResult(resultId, resultStatus, request.Platforms.Count);
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (DomainException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error saving post");
            throw new DomainException("zernio_save_post_error", $"Failed to save Zernio post", ex);
        }
    }

    // ── UpdatePostAsync: Raw HTTP request to bypass SDK oneOf deserialization ──────
    public async Task<ZernioCreatePostResult> UpdatePostAsync(
        ZernioCreatePostRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.PostId))
        {
            throw new DomainException("invalid_update_post_request", "PostId is required to update an existing post.");
        }

        var normalizedStatus = request.Status?.ToLowerInvariant() ?? "draft";

        try
        {
            if (normalizedStatus == "published")
            {
                if (request.Platforms.Count != 1 || !string.Equals(request.Platforms[0].Platform, "twitter", StringComparison.OrdinalIgnoreCase))
                {
                    throw new DomainException("invalid_edit_platform", "Only published posts on Twitter/X can be edited.");
                }

                var editRequest = new EditPostRequest(EditPostRequest.PlatformEnum.Twitter, request.Content ?? string.Empty);
                await _postsApi.EditPostAsync(request.PostId, editRequest, cancellationToken);
                return new ZernioCreatePostResult(request.PostId, "published", request.Platforms.Count);
            }

            var sdkRequest = ToSdkUpdatePostRequest(request);
            var config = _postsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            using var httpRequest = new HttpRequestMessage(HttpMethod.Put, $"{baseUrl}/v1/posts/{request.PostId}");
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            var jsonBody = System.Text.Json.JsonSerializer.Serialize(sdkRequest, _jsonOptions);
            httpRequest.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 402)
                {
                    _logger.LogWarning("Zernio billing gate triggered updating post {PostId}. Content: {Content}", request.PostId, errorContent);
                    throw new ZernioBillingRequiredException(
                        "A paid Zernio plan is required to update posts.",
                        reason: "post_management_restricted",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { zernioPostId = request.PostId });
                }

                _logger.LogError("Zernio API error updating post {PostId}. Status: {StatusCode}, Error: {Error}", request.PostId, httpResponse.StatusCode, errorContent);
                throw new DomainException("zernio_update_post_error", $"Failed to update Zernio post. Status: {httpResponse.StatusCode}. Error: {errorContent}");
            }

            var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var rawResponse = System.Text.Json.JsonSerializer.Deserialize<ZernioRawCreatePostResponse>(responseJson, _jsonOptions);

            var resultId = rawResponse?.Post?._Id ?? request.PostId ?? string.Empty;
            var resultStatus = rawResponse?.Post?.Status ?? request.Status ?? "scheduled";

            return new ZernioCreatePostResult(resultId, resultStatus, request.Platforms.Count);
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (DomainException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error updating post {PostId}", request.PostId);
            throw new DomainException("zernio_update_post_error", $"Failed to update Zernio post", ex);
        }
    }

    // Simple update for ZernioUpdatePostRequestDto - Raw HTTP request to bypass SDK oneOf deserialization
    public async Task UpdatePostAsync(
        string zernioPostId,
        Syncra.Application.DTOs.Zernio.ZernioUpdatePostRequestDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.UpdatePostRequest
            {
                Content = request.Content
            };

            if (request.ScheduledForUtc.HasValue)
            {
                sdkRequest.ScheduledFor = request.ScheduledForUtc.Value;
            }

            var config = _postsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            using var httpRequest = new HttpRequestMessage(HttpMethod.Put, $"{baseUrl}/v1/posts/{zernioPostId}");
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            var jsonBody = System.Text.Json.JsonSerializer.Serialize(sdkRequest, _jsonOptions);
            httpRequest.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 402)
                {
                    _logger.LogWarning("Zernio billing gate triggered for post update {PostId}. Content: {Content}", zernioPostId, errorContent);
                    throw new ZernioBillingRequiredException(
                        "A paid Zernio plan is required to update posts.",
                        reason: "post_management_restricted",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { zernioPostId });
                }

                _logger.LogError("Zernio API error updating post {PostId}. Status: {StatusCode}, Content: {Content}", zernioPostId, httpResponse.StatusCode, errorContent);
                throw new DomainException("zernio_update_post_error", $"Failed to update Zernio post. Error: {errorContent}");
            }
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (DomainException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error updating post {PostId}", zernioPostId);
            throw new DomainException("zernio_update_post_error", $"Failed to update Zernio post", ex);
        }
    }

    public async Task<ZernioPresignResponse> GetMediaPresignedUrlAsync(
        string fileName,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(mimeType)) throw new ArgumentException("Mime type cannot be null or empty.", nameof(mimeType));
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("File name cannot be null or empty.", nameof(fileName));

        Zernio.Model.GetMediaPresignedUrl200Response? presignResult = null;
        try
        {
            var contentType = MapMimeTypeToContentTypeEnum(mimeType);
            var presignRequest = new Zernio.Model.GetMediaPresignedUrlRequest(fileName, contentType);
            presignResult = await _mediaApi.GetMediaPresignedUrlAsync(presignRequest, cancellationToken: cancellationToken);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Failed to get presigned URL from Zernio. ErrorCode: {ErrorCode}", ex.ErrorCode);
            throw new DomainException("zernio_presign_error", $"Zernio presign request failed. Status: {ex.ErrorCode}. Error: {ex.Message}", ex);
        }

        if (presignResult == null || string.IsNullOrEmpty(presignResult.UploadUrl) || string.IsNullOrEmpty(presignResult.PublicUrl))
        {
            throw new DomainException("zernio_presign_error", "Zernio returned an invalid presign response.");
        }

        return new ZernioPresignResponse(
            presignResult.UploadUrl,
            presignResult.PublicUrl);
    }

    public async Task<string> UploadMediaToZernioAsync(
        string uploadUrl,
        Stream content,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        if (content == null) throw new ArgumentNullException(nameof(content));
        if (string.IsNullOrWhiteSpace(uploadUrl)) throw new ArgumentException("Upload URL cannot be null or empty.", nameof(uploadUrl));
        if (string.IsNullOrWhiteSpace(mimeType)) throw new ArgumentException("Mime type cannot be null or empty.", nameof(mimeType));

        // Buffer stream nếu không thể seek
        Stream uploadStream = content;
        long? contentLength = null;
        if (content.CanSeek)
        {
            contentLength = content.Length;
        }
        else
        {
            var memoryStream = new MemoryStream();
            await content.CopyToAsync(memoryStream, cancellationToken);
            memoryStream.Position = 0;
            uploadStream = memoryStream;
            contentLength = memoryStream.Length;
        }

        using var uploadRequest = new HttpRequestMessage(HttpMethod.Put, uploadUrl);
        var streamContent = new StreamContent(uploadStream);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
        if (contentLength.HasValue)
        {
            streamContent.Headers.ContentLength = contentLength.Value;
        }
        uploadRequest.Content = streamContent;

        using var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromMinutes(30);
        var response = await httpClient.SendAsync(uploadRequest, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to upload media to Zernio. Status: {StatusCode}, Error: {Error}",
                response.StatusCode, errorContent);
            throw new DomainException("zernio_upload_error", $"Failed to upload media to Zernio. Status: {response.StatusCode}. Error: {errorContent}");
        }

        _logger.LogInformation("Successfully uploaded media stream to Zernio presigned URL.");

        // Extract public URL từ response hoặc trả về empty (response có thể không có body)
        // Presigned upload thường không trả về body, publicUrl đã có từ GetMediaPresignedUrlAsync
        return string.Empty;
    }

    public async Task<ZernioUploadDirectResult> UploadMediaDirectAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (content == null) throw new ArgumentNullException(nameof(content));
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("File name cannot be null or empty.", nameof(fileName));
        if (string.IsNullOrWhiteSpace(contentType)) throw new ArgumentException("Content type cannot be null or empty.", nameof(contentType));

        try
        {
            var config = _mediaApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            // Buffer stream to byte[] để có Content-Length chính xác (tránh chunked transfer).
            byte[] fileBytes;
            if (content is MemoryStream ms)
            {
                fileBytes = ms.ToArray();
            }
            else if (content.CanSeek)
            {
                content.Position = 0;
                fileBytes = new byte[content.Length];
                int offset = 0;
                while (offset < fileBytes.Length)
                {
                    int read = await content.ReadAsync(fileBytes.AsMemory(offset, fileBytes.Length - offset), cancellationToken);
                    if (read == 0) break;
                    offset += read;
                }
            }
            else
            {
                using var buffer = new MemoryStream();
                await content.CopyToAsync(buffer, cancellationToken);
                fileBytes = buffer.ToArray();
            }

            // Build multipart/form-data body thủ công để tránh mọi ambiguity của .NET MultipartFormDataContent
            // (một số FastAPI parser reject Content-Type của inner part khi Content-Type outer đã có).
            // Chỉ gửi field "file" (required), bỏ qua contentType form field — Zernio auto-detect từ file.
            const string boundary = "----SyncraBoundary7d4f6b8e";
            var headerSb = new StringBuilder();
            headerSb.Append("--").Append(boundary).Append("\r\n");
            headerSb.Append("Content-Disposition: form-data; name=\"file\"; filename=\"").Append(fileName).Append("\"\r\n");
            headerSb.Append("Content-Type: ").Append(contentType).Append("\r\n");
            headerSb.Append("\r\n");
            var headerBytes = Encoding.UTF8.GetBytes(headerSb.ToString());
            var footerBytes = Encoding.UTF8.GetBytes($"\r\n--{boundary}--\r\n");

            var body = new byte[headerBytes.Length + fileBytes.Length + footerBytes.Length];
            Buffer.BlockCopy(headerBytes, 0, body, 0, headerBytes.Length);
            Buffer.BlockCopy(fileBytes, 0, body, headerBytes.Length, fileBytes.Length);
            Buffer.BlockCopy(footerBytes, 0, body, headerBytes.Length + fileBytes.Length, footerBytes.Length);

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/media/upload-direct");
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            var byteContent = new ByteArrayContent(body);
            byteContent.Headers.ContentType = new MediaTypeHeaderValue("multipart/form-data");
            byteContent.Headers.ContentType.Parameters.Add(new NameValueHeaderValue("boundary", boundary));
            byteContent.Headers.ContentLength = body.Length;
            httpRequest.Content = byteContent;

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromMinutes(30);
            var response = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to upload media direct to Zernio. Status: {StatusCode}, Error: {Error}",
                    response.StatusCode, errorContent);
                throw new DomainException("zernio_upload_direct_error",
                    $"Failed to upload media to Zernio. Status: {response.StatusCode}. Error: {errorContent}");
            }

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(responseBody))
            {
                throw new DomainException("zernio_upload_direct_error", "Zernio returned an empty upload-direct response.");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;
            var url = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString()
                : throw new DomainException("zernio_upload_direct_error", "Zernio upload-direct response missing 'url' field.");

            var returnedFileName = root.TryGetProperty("filename", out var fnEl) ? fnEl.GetString() : fileName;
            var returnedContentType = root.TryGetProperty("contentType", out var ctEl) ? ctEl.GetString() : contentType;
            long? size = root.TryGetProperty("size", out var sEl) && sEl.TryGetInt64(out var s) ? s : null;

            _logger.LogInformation("Successfully uploaded media direct to Zernio. Url: {Url}, Size: {Size}", url, size);
            return new ZernioUploadDirectResult(url, returnedFileName ?? fileName, returnedContentType, size);
        }
        catch (DomainException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error uploading media direct");
            throw new DomainException("zernio_upload_direct_error", "Failed to upload media to Zernio via upload-direct.", ex);
        }
    }

    public async Task RetryPostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _postsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/posts/{zernioPostId}/retry");
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 402)
                {
                    _logger.LogWarning("Zernio billing gate triggered retrying post {PostId}. Content: {Content}", zernioPostId, errorContent);
                    throw new ZernioBillingRequiredException(
                        "A paid Zernio plan is required to retry posts.",
                        reason: "post_management_restricted",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { zernioPostId });
                }

                _logger.LogError("Zernio API error retrying post {PostId}. Status: {StatusCode}, Error: {Error}", zernioPostId, httpResponse.StatusCode, errorContent);
                throw new DomainException("zernio_retry_post_error", $"Failed to retry Zernio post. Status: {httpResponse.StatusCode}. Error: {errorContent}");
            }
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (DomainException)
        {
            throw;
        }
        catch (Exception ex)
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

    private static readonly Dictionary<string, UnpublishPostRequest.PlatformEnum> PlatformMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["threads"] = UnpublishPostRequest.PlatformEnum.Threads,
        ["facebook"] = UnpublishPostRequest.PlatformEnum.Facebook,
        ["twitter"] = UnpublishPostRequest.PlatformEnum.Twitter,
        ["linkedin"] = UnpublishPostRequest.PlatformEnum.Linkedin,
        ["youtube"] = UnpublishPostRequest.PlatformEnum.Youtube,
        ["pinterest"] = UnpublishPostRequest.PlatformEnum.Pinterest,
        ["reddit"] = UnpublishPostRequest.PlatformEnum.Reddit,
        ["bluesky"] = UnpublishPostRequest.PlatformEnum.Bluesky,
        ["googlebusiness"] = UnpublishPostRequest.PlatformEnum.Googlebusiness,
        ["telegram"] = UnpublishPostRequest.PlatformEnum.Telegram,
    };

    public async Task UnpublishPostAsync(
        string zernioPostId,
        string platform,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!PlatformMap.TryGetValue(platform, out var platformEnum))
            {
                _logger.LogWarning("Platform {Platform} is not supported for API unpublishing. Skipping Zernio unpublish API call.", platform);
                throw new NotSupportedException($"Platform {platform} is not supported for API unpublishing.");
            }

            var request = new UnpublishPostRequest(platformEnum);
            await _postsApi.UnpublishPostAsync(zernioPostId, request, cancellationToken);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered unpublishing post {PostId}", zernioPostId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to manage posts.",
                reason: "post_management_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { zernioPostId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error unpublishing post {PostId}", zernioPostId);
            throw new DomainException("zernio_unpublish_post_error", "Failed to unpublish Zernio post", ex);
        }
    }

    public async Task<ZernioPostListResponseDto> ListPostsAsync(
        int? page = null,
        int? limit = null,
        string? status = null,
        string? platform = null,
        string? search = null,
        string? sortBy = null,
        string? accountId = null,
        string? profileId = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _postsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');
            var queryParams = new Dictionary<string, string?>
            {
                ["page"] = page?.ToString(),
                ["limit"] = limit?.ToString(),
                ["status"] = status,
                ["platform"] = platform,
                ["search"] = search,
                ["sortBy"] = sortBy ?? "scheduled-desc",
                ["accountId"] = accountId,
                ["profileId"] = profileId,
                ["dateFrom"] = dateFrom?.ToString("o"),
                ["dateTo"] = dateTo?.ToString("o")
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/posts?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);

            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var rawResponse = System.Text.Json.JsonSerializer.Deserialize<ZernioRawPostListResponse>(json, _jsonOptions);

            if (rawResponse?.Posts is null)
                return new ZernioPostListResponseDto([], 1, 0, 0, 1);

            var posts = rawResponse.Posts.Select(p => new ZernioPostListItemDto(
                Id: p._Id ?? string.Empty,
                Title: p.Title ?? string.Empty,
                Content: p.Content,
                Status: p.Status ?? "draft",
                ScheduledFor: p.ScheduledFor,
                Timezone: p.Timezone,
                Platforms: (p.Platforms ?? [])
                    .Select(pl => new ZernioPostPlatformTargetDto(
                        Platform: pl.Platform ?? string.Empty,
                        AccountId: pl.AccountId?._Id ?? string.Empty,
                        Status: pl.Status ?? "pending",
                        PlatformPostId: pl.PlatformPostId,
                        PlatformPostUrl: pl.PlatformPostUrl,
                        PublishedAt: pl.PublishedAt,
                        ErrorMessage: pl.ErrorMessage,
                        PlatformSpecificData: pl.PlatformSpecificData))
                    .ToList(),
                Tags: p.Tags ?? [],
                ZernioMediaItems: (p.MediaItems ?? []).Select(m => new ZernioMediaItemDto(
                    Id: m._Id ?? string.Empty,
                    Type: m.Type ?? "image",
                    Url: m.Url ?? string.Empty,
                    Filename: m.Filename,
                    Size: m.Size,
                    MimeType: m.MimeType)).ToList(),
                CreatedAt: p.CreatedAt ?? DateTime.MinValue,
                UpdatedAt: p.UpdatedAt ?? DateTime.MinValue,
                PublishedAt: null))
                .ToList();

            return new ZernioPostListResponseDto(
                posts,
                rawResponse.Pagination?.Page ?? 1,
                rawResponse.Pagination?.Limit ?? 0,
                rawResponse.Pagination?.Total ?? 0,
                rawResponse.Pagination?.Pages ?? 1);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing posts");
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to list posts.",
                reason: "post_list_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error listing posts");
            throw new DomainException("zernio_list_posts_error", "Failed to list posts from Zernio", ex);
        }
    }

    private static readonly System.Text.Json.JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private static object? NormalizeMetadata(object? metadata)
    {
        if (metadata is null) return null;
        return System.Text.Json.JsonSerializer.Deserialize<object>(metadata.ToString());
    }

    private static object? MapPlatformSpecificData(string platform, ZernioCreatePostRequest request)
    {
        var normalizedPlatform = platform.ToLowerInvariant();

        return normalizedPlatform switch
        {
            "twitter" => request.PlatformSpecificData?.Twitter,
            "threads" => request.PlatformSpecificData?.Threads,
            "facebook" => request.PlatformSpecificData?.Facebook
                ?? new FacebookPlatformDataDto(Draft: request.IsDraft ?? false),
            "instagram" => request.PlatformSpecificData?.Instagram
                ?? new InstagramPlatformDataDto(),
            "linkedin" => request.PlatformSpecificData?.LinkedIn
                ?? new LinkedInPlatformDataDto(),
            "pinterest" => request.PlatformSpecificData?.Pinterest
                ?? new PinterestPlatformDataDto(Title: request.Title ?? "", BoardId: ""),
            "youtube" => request.PlatformSpecificData?.YouTube
                ?? new YouTubePlatformDataDto(Title: request.Title ?? ""),
            "googlebusiness" => request.PlatformSpecificData?.GoogleBusiness,
            "telegram" => request.PlatformSpecificData?.Telegram,
            "snapchat" => request.PlatformSpecificData?.Snapchat,
            "reddit" => request.PlatformSpecificData?.Reddit
                ?? new RedditPlatformDataDto(Subreddit: "", Title: request.Title ?? ""),
            "bluesky" => request.PlatformSpecificData?.Bluesky,
            "discord" => request.PlatformSpecificData?.Discord,
            // TikTok settings must be at root level
            "tiktok" => null,
            _ => null
        };
    }

    private static object? FilterMediaForPlatform(string platform, IReadOnlyList<Syncra.Application.DTOs.Posts.PostMediaItemDto>? mediaItems)
    {
        if (mediaItems == null) return null;

        var normalizedPlatform = platform.ToLowerInvariant();
        var filtered = mediaItems.AsEnumerable();

        if (normalizedPlatform == "youtube")
        {
            filtered = filtered.Where(m => string.Equals(m.Type, "video", StringComparison.OrdinalIgnoreCase));
        }
        else if (normalizedPlatform == "googlebusiness")
        {
            filtered = filtered.Where(m => string.Equals(m.Type, "image", StringComparison.OrdinalIgnoreCase));
        }

        return filtered.Select(m => new
        {
            type = m.Type.ToLowerInvariant(),
            url = m.Url,
            filename = m.Filename,
            mimeType = m.MimeType
        }).ToList();
    }

    private object ToSdkCreatePostRequest(ZernioCreatePostRequest request)
    {
        var platforms = request.Platforms.Select(p =>
        {
            var platformContent = request.PlatformContents?.FirstOrDefault(c => c.Platform == p.Platform);
            return new
            {
                platform = p.Platform,
                accountId = p.ZernioAccountId,
                customContent = platformContent?.Caption,
                customMedia = FilterMediaForPlatform(p.Platform, request.MediaItems),
                platformSpecificData = MapPlatformSpecificData(p.Platform, request)
            };
        }).ToList();

        var mediaItems = request.MediaItems?
            .Select(m => new
            {
                type = m.Type.ToLowerInvariant(),
                url = m.Url,
                filename = m.Filename,
                mimeType = m.MimeType
            })
            .ToList();

        var tiktokSettings = BuildSdkTikTokSettings(request);
        var facebookSettings = BuildSdkFacebookSettings(request);

        return new
        {
            title = request.Title ?? string.Empty,
            content = request.Content ?? string.Empty,
            mediaItems = mediaItems,
            platforms = platforms,
            scheduledFor = request.ScheduledForUtc,
            publishNow = request.PublishNow,
            isDraft = request.IsDraft ?? false,
            tiktokSettings = tiktokSettings,
            facebookSettings = facebookSettings
        };
    }

    private object ToSdkUpdatePostRequest(ZernioCreatePostRequest request)
    {
        var platforms = request.Platforms.Select(p =>
        {
            var platformContent = request.PlatformContents?.FirstOrDefault(c => c.Platform == p.Platform);
            return new
            {
                platform = p.Platform,
                accountId = p.ZernioAccountId,
                customContent = platformContent?.Caption,
                customMedia = FilterMediaForPlatform(p.Platform, request.MediaItems),
                platformSpecificData = MapPlatformSpecificData(p.Platform, request)
            };
        }).ToList();

        var mediaItems = request.MediaItems?
            .Select(m => new
            {
                type = m.Type.ToLowerInvariant(),
                url = m.Url,
                filename = m.Filename,
                mimeType = m.MimeType
            })
            .ToList();

        var tiktokSettings = BuildSdkTikTokSettings(request);
        var facebookSettings = BuildSdkFacebookSettings(request);

        return new
        {
            title = request.Title ?? string.Empty,
            content = request.Content ?? string.Empty,
            mediaItems = mediaItems,
            platforms = platforms,
            scheduledFor = request.ScheduledForUtc,
            publishNow = request.PublishNow,
            isDraft = request.IsDraft ?? false,
            tiktokSettings = tiktokSettings,
            facebookSettings = facebookSettings
        };
    }

    private TikTokPlatformData? BuildSdkTikTokSettings(ZernioCreatePostRequest request)
    {
        var settings = request.TiktokSettings;
        if (settings == null && request.Platforms.Any(p => string.Equals(p.Platform, "tiktok", StringComparison.OrdinalIgnoreCase)))
        {
            return new TikTokPlatformData(
                request.IsDraft ?? false,
                "PUBLIC_TO_EVERYONE",
                true,
                true,
                true,
                null,
                false,
                false,
                true,
                true,
                null,
                0,
                null,
                0,
                false,
                false,
                null
            );
        }

        if (settings == null) return null;

        return new TikTokPlatformData(
            settings.Draft ?? false,
            settings.PrivacyLevel ?? "PUBLIC_TO_EVERYONE",
            settings.AllowComment ?? true,
            settings.AllowDuet ?? true,
            settings.AllowStitch ?? true,
            ParseEnum<TikTokPlatformData.CommercialContentTypeEnum>(settings.CommercialContentType),
            settings.BrandPartnerPromote ?? false,
            settings.IsBrandOrganicPost ?? false,
            settings.ContentPreviewConfirmed ?? true,
            settings.ExpressConsentGiven ?? true,
            ParseEnum<TikTokPlatformData.MediaTypeEnum>(settings.MediaType),
            settings.VideoCoverTimestampMs ?? 0,
            settings.VideoCoverImageUrl,
            settings.PhotoCoverIndex ?? 0,
            settings.AutoAddMusic ?? false,
            settings.VideoMadeWithAi ?? false,
            settings.Description
        );
    }

    private FacebookPlatformData? BuildSdkFacebookSettings(ZernioCreatePostRequest request)
    {
        var fbData = request.PlatformSpecificData?.Facebook;
        if (fbData == null) return null;

        var cards = fbData.CarouselCards?
            .Select(c => new FacebookPlatformDataCarouselCardsInner(c.Link, c.Name, c.Description))
            .ToList();

        return new FacebookPlatformData(
            fbData.Draft ?? request.IsDraft ?? false,
            ParseEnum<FacebookPlatformData.ContentTypeEnum>(fbData.ContentType),
            fbData.Title,
            fbData.FirstComment,
            fbData.PageId,
            null,
            cards,
            fbData.CarouselLink
        );
    }

    private static MediaItem.TypeEnum? ParseMediaTypeEnum(string? type)
    {
        return type?.ToLowerInvariant() switch
        {
            "image" => MediaItem.TypeEnum.Image,
            "video" => MediaItem.TypeEnum.Video,
            "gif" => MediaItem.TypeEnum.Gif,
            "document" => MediaItem.TypeEnum.Document,
            _ => null
        };
    }

    private static TEnum? ParseEnum<TEnum>(string? value) where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (Enum.TryParse<TEnum>(value, ignoreCase: true, out var result)) return result;
        return null;
    }

    private static ZernioCreatePostResult MapSdkPostToResult(Zernio.Model.Post? post, ZernioCreatePostRequest request, string? fallbackPostId = null)
    {
        return new ZernioCreatePostResult(
            post?.Id ?? fallbackPostId ?? request.PostId ?? string.Empty,
            post?.Status?.ToString() ?? request.Status ?? "scheduled",
            request.Platforms.Count);
    }

    // ── Analytics methods ────────────────────────────────────────────────────

    private static readonly HashSet<string> AllowedSources = ["all", "late", "external"];

    public async Task<ZernioBestTimeDto> GetBestTimeAsync(
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default)
    {
        if (source is not null && !AllowedSources.Contains(source))
            throw new ArgumentException($"Invalid source '{source}'. Allowed values: {string.Join(", ", AllowedSources)}", nameof(source));

        try
        {
            var response = await _analyticsApi.GetBestTimeToPostAsync(
                platform: platform,
                profileId: profileId,
                accountId: accountId,
                source: source,
                cancellationToken);

            var slots = (response.Slots ?? [])
                .Select(s => new ZernioBestTimeSlotDto(
                    s.DayOfWeek,
                    s.Hour,
                    (double)s.AvgEngagement,
                    s.PostCount))
                .OrderByDescending(s => s.AvgEngagement)
                .ToList();

            return new ZernioBestTimeDto(slots);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate (402) for best-time, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access best-time analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            var requiresAddon = TryParseRequiresAddon(ex.ErrorContent?.ToString());
            if (requiresAddon)
            {
                _logger.LogWarning(ex, "Zernio billing gate (403 requiresAddon) for best-time, profile {ProfileId}", profileId);
                throw new ZernioBillingRequiredException(
                    "Analytics add-on is required to access best-time analytics.",
                    reason: "analytics_addon_required",
                    dashboardUrl: "https://zernio.com/dashboard/billing",
                    details: new { profileId, accountId, source });
            }

            _logger.LogWarning(ex, "Zernio 403 Forbidden for best-time, profile {ProfileId}", profileId);
            throw new ZernioUnauthorizedException(
                "Zernio returned 403 Forbidden for best-time analytics. Check account permissions.",
                details: new { profileId, platform, accountId, source });
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

    private static bool TryParseRequiresAddon(string? errorContent)
    {
        if (string.IsNullOrEmpty(errorContent))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(errorContent);
            return doc.RootElement.TryGetProperty("requiresAddon", out var prop) && prop.GetBoolean();
        }
        catch
        {
            return false;
        }
    }

    private static string? TryParseErrorCode(string? errorContent)
    {
        if (string.IsNullOrEmpty(errorContent))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(errorContent);
            if (doc.RootElement.TryGetProperty("code", out var codeProp) &&
                codeProp.ValueKind == JsonValueKind.String)
            {
                return codeProp.GetString();
            }
            return null;
        }
        catch
        {
            return null;
        }
    }

    public async Task<ZernioContentDecayResponseDto> GetContentDecayAsync(
        string? platform = null,
        string? profileId = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: platform,
            profileId: profileId,
            accountId: accountId,
            source: source,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: null,
            order: null);

        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["platform"] = platform,
                ["profileId"] = profileId,
                ["accountId"] = accountId,
                ["source"] = source ?? "all"
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/content-decay?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 401)
                {
                    _logger.LogWarning("Zernio content-decay unauthorized: {Error}", errorContent);
                    throw new ZernioUnauthorizedException(
                        "Zernio API key is missing or invalid.",
                        details: new { errorContent });
                }

                if (errorCode == 403)
                {
                    _logger.LogWarning("Zernio content-decay analytics add-on required: {Error}", errorContent);
                    throw new ZernioBillingRequiredException(
                        "Analytics add-on is required to access content decay analytics.",
                        reason: "analytics_addon_required",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { errorContent });
                }

                _logger.LogError("Zernio content-decay error. Status: {StatusCode}, Error: {Error}", errorCode, errorContent);
                throw new DomainException("zernio_content_decay_error", $"Failed to fetch content decay. Status: {errorCode}. Error: {errorContent}");
            }

            var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            using var doc = System.Text.Json.JsonDocument.Parse(responseJson);
            var root = doc.RootElement;

            var buckets = new List<ZernioContentDecayBucketDto>();
            if (root.TryGetProperty("buckets", out var bucketsEl) && bucketsEl.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var bucketEl in bucketsEl.EnumerateArray())
                {
                    buckets.Add(new ZernioContentDecayBucketDto(
                        BucketOrder: bucketEl.GetProperty("bucket_order").GetInt32(),
                        BucketLabel: bucketEl.GetProperty("bucket_label").GetString() ?? string.Empty,
                        AvgPctOfFinal: bucketEl.GetProperty("avg_pct_of_final").GetDouble(),
                        PostCount: bucketEl.GetProperty("post_count").GetInt32()));
                }
            }

            return new ZernioContentDecayResponseDto(buckets.OrderBy(b => b.BucketOrder).ToList());
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioUnauthorizedException) { throw; }
        catch (ZernioBadRequestException) { throw; }
        catch (DomainException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching content decay");
            throw new DomainException("zernio_content_decay_error", "Failed to fetch content decay analytics", ex);
        }
    }

    public async Task<ZernioDailyMetricsDto> GetDailyMetricsAsync(
        string? profileId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _analyticsApi.GetDailyMetricsAsync(
                platform: platform,
                profileId: profileId,
                accountId: accountId,
                fromDate: fromDate,
                toDate: toDate,
                source: source,
                cancellationToken);

            var dailyData = (response.DailyData ?? [])
                .Select(d => new ZernioDailyDataPointDto(
                    d.Date,
                    d.PostCount,
                    d.Platforms ?? new Dictionary<string, int>(),
                    new ZernioMetricsDto(
                        d.Metrics?.Impressions ?? 0,
                        d.Metrics?.Reach ?? 0,
                        d.Metrics?.Likes ?? 0,
                        d.Metrics?.Comments ?? 0,
                        d.Metrics?.Shares ?? 0,
                        d.Metrics?.Saves ?? 0,
                        d.Metrics?.Clicks ?? 0,
                        d.Metrics?.Views ?? 0)))
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

            return new ZernioDailyMetricsDto(dailyData, platformBreakdown);
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

    public async Task<ZernioFacebookPageInsightsResponseDto> GetFacebookPageInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateFacebookPageInsights(
            accountId, metrics, since, until, metricType, cancellationToken);

        metrics ??= "page_media_view,page_post_engagements,page_follows,followers_gained,followers_lost";
        metricType ??= "total_value";

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var sinceDate = DateOnly.TryParse(since, out var parsedSince) ? parsedSince : today.AddDays(-30);
        var untilDate = DateOnly.TryParse(until, out var parsedUntil) ? parsedUntil : today;

        try
        {
            var response = await _analyticsApi.GetFacebookPageInsightsAsync(
                accountId: accountId,
                metrics: metrics,
                since: sinceDate,
                until: untilDate,
                metricType: metricType,
                cancellationToken);

            var metricsDict = new Dictionary<string, ZernioFacebookPageInsightsMetricDto>();
            if (response.Metrics != null)
            {
                foreach (var kvp in response.Metrics)
                {
                    metricsDict[kvp.Key] = new ZernioFacebookPageInsightsMetricDto(
                        Total: (int)kvp.Value.Total,
                        Values: kvp.Value.Values?.Select(v => new ZernioFacebookPageInsightsValueDto(
                            Date: v.Date.ToString("yyyy-MM-dd"),
                            Value: (int)v.Value)).ToList() ?? new List<ZernioFacebookPageInsightsValueDto>());
                }
            }
            return new ZernioFacebookPageInsightsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform?.ToString() ?? string.Empty,
                DateRange: new ZernioDateRangeDto(
                    Since: response.DateRange?.Since.ToString("yyyy-MM-dd") ?? string.Empty,
                    Until: response.DateRange?.Until.ToString("yyyy-MM-dd") ?? string.Empty),
                MetricType: response.MetricType?.ToString() ?? string.Empty,
                Metrics: metricsDict,
                DataDelay: response.DataDelay);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for Facebook page insights, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access Facebook page insights.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for Facebook page insights, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "facebook",
                "Additional analytics permissions are required for Facebook page insights. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching Facebook page insights for account {AccountId}", accountId);
            throw new DomainException("zernio_facebook_page_insights_error", "Failed to fetch Facebook page insights from Zernio", ex);
        }
    }

    public async Task<ZernioGoogleBusinessSearchKeywordsResponseDto> GetGoogleBusinessSearchKeywordsAsync(
        string accountId,
        string? startMonth = null,
        string? endMonth = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateGoogleBusinessSearchKeywords(
            accountId, startMonth, endMonth, cancellationToken);

        // Apply defaults: 3 months ago and current month in YYYY-MM format
        var now = DateTime.UtcNow;
        startMonth ??= now.AddMonths(-3).ToString("yyyy-MM");
        endMonth ??= now.ToString("yyyy-MM");

        try
        {
            var response = await _analyticsApi.GetGoogleBusinessSearchKeywordsAsync(
                accountId: accountId,
                startMonth: startMonth,
                endMonth: endMonth,
                cancellationToken: cancellationToken);

            var keywords = response.Keywords?
                .Select(k => new ZernioSearchKeywordDto(
                    Keyword: k.Keyword ?? string.Empty,
                    Impressions: k.Impressions))
                .ToList() ?? new List<ZernioSearchKeywordDto>();

            return new ZernioGoogleBusinessSearchKeywordsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform ?? "googlebusiness",
                MonthRange: new ZernioMonthRangeDto(
                    StartMonth: response.MonthRange?.StartMonth ?? startMonth,
                    EndMonth: response.MonthRange?.EndMonth ?? endMonth),
                Keywords: keywords,
                Note: response.Note);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for GBP search keywords, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio Analytics add-on is required to access Google Business search keywords.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for GBP search keywords, account {AccountId}", accountId);
            throw new DomainException("zernio_access_denied", $"Access denied to Google Business account '{accountId}'.", ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for GBP search keywords, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "googlebusiness",
                "Additional analytics permissions are required for Google Business search keywords. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching GBP search keywords for account {AccountId}", accountId);
            throw new DomainException("zernio_gbp_search_keywords_error", "Failed to fetch Google Business search keywords from Zernio.", ex);
        }
    }

    public async Task<ZernioGoogleBusinessPerformanceResponseDto> GetGoogleBusinessPerformanceAsync(
        string accountId,
        string? metrics = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateGoogleBusinessPerformance(
            accountId,
            metrics,
            startDate?.ToString("yyyy-MM-dd"),
            endDate?.ToString("yyyy-MM-dd"),
            cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStart = startDate ?? today.AddDays(-30);
        var effectiveEnd = endDate ?? today;

        try
        {
            var response = await _analyticsApi.GetGoogleBusinessPerformanceAsync(
                accountId: accountId,
                metrics: metrics,
                startDate: effectiveStart,
                endDate: effectiveEnd,
                cancellationToken);

            var metricsDict = new Dictionary<string, ZernioGoogleBusinessPerformanceMetricDto>(StringComparer.Ordinal);
            if (response.Metrics != null)
            {
                foreach (var kvp in response.Metrics)
                {
                    metricsDict[kvp.Key] = new ZernioGoogleBusinessPerformanceMetricDto(
                        Total: kvp.Value.Total,
                        Values: (kvp.Value.Values ?? new List<Zernio.Model.GetGoogleBusinessPerformance200ResponseMetricsValueValuesInner>())
                            .Select(v => new ZernioGoogleBusinessPerformanceValueDto(
                                Date: v.Date.ToString("yyyy-MM-dd"),
                                Value: v.Value))
                            .ToList());
                }
            }

            return new ZernioGoogleBusinessPerformanceResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform ?? "googlebusiness",
                DateRange: new ZernioGoogleBusinessDateRangeDto(
                    StartDate: response.DateRange?.StartDate.ToString("yyyy-MM-dd") ?? effectiveStart.ToString("yyyy-MM-dd"),
                    EndDate: response.DateRange?.EndDate.ToString("yyyy-MM-dd") ?? effectiveEnd.ToString("yyyy-MM-dd")),
                Metrics: metricsDict,
                DataDelay: response.DataDelay);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for Google Business performance, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access Google Business performance metrics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for Google Business performance, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "googlebusiness",
                "Additional analytics permissions are required for Google Business performance. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for Google Business performance, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching Google Business performance for account {AccountId}", accountId);
            throw new DomainException("zernio_google_business_performance_error", "Failed to fetch Google Business performance from Zernio", ex);
        }
    }

    public async Task<ZernioInstagramAccountInsightsResponseDto> GetInstagramAccountInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        string? breakdown = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateInstagramAccountInsights(
            accountId,
            metrics,
            since,
            until,
            metricType,
            breakdown,
            cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly effectiveSince;
        DateOnly effectiveUntil;
        if (string.IsNullOrWhiteSpace(since) && DateOnly.TryParse(since, out _))
        {
            // no-op placeholder; real parse below
            effectiveSince = today.AddDays(-30);
        }
        else if (DateOnly.TryParse(since, out var parsedSince))
        {
            effectiveSince = parsedSince;
        }
        else
        {
            effectiveSince = today.AddDays(-30);
        }

        if (DateOnly.TryParse(until, out var parsedUntil))
        {
            effectiveUntil = parsedUntil;
        }
        else
        {
            effectiveUntil = today;
        }

        try
        {
            var response = await _analyticsApi.GetInstagramAccountInsightsAsync(
                accountId: accountId,
                metrics: metrics,
                since: effectiveSince,
                until: effectiveUntil,
                metricType: metricType,
                breakdown: breakdown,
                cancellationToken);

            var metricsDict = new Dictionary<string, ZernioInstagramAccountInsightsMetricDto>(StringComparer.Ordinal);
            if (response.Metrics != null)
            {
                foreach (var kvp in response.Metrics)
                {
                    IReadOnlyList<ZernioInstagramAccountInsightsValueDto>? values = null;
                    if (kvp.Value?.Values != null)
                    {
                        values = kvp.Value.Values
                            .Select(v => new ZernioInstagramAccountInsightsValueDto(
                                Date: v.Date.ToString("yyyy-MM-dd"),
                                Value: v.Value))
                            .ToList();
                    }

                    IReadOnlyList<ZernioInstagramAccountInsightsBreakdownDto>? breakdowns = null;
                    if (kvp.Value?.Breakdowns != null)
                    {
                        breakdowns = kvp.Value.Breakdowns
                            .Select(b => new ZernioInstagramAccountInsightsBreakdownDto(
                                Dimension: b.Dimension ?? string.Empty,
                                Value: b.Value))
                            .ToList();
                    }

                    metricsDict[kvp.Key] = new ZernioInstagramAccountInsightsMetricDto(
                        Total: kvp.Value?.Total ?? 0m,
                        Values: values,
                        Breakdowns: breakdowns);
                }
            }

            return new ZernioInstagramAccountInsightsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform?.ToString().ToLowerInvariant() ?? "instagram",
                DateRange: new ZernioDateRangeDto(
                    Since: response.DateRange?.Since.ToString("yyyy-MM-dd") ?? effectiveSince.ToString("yyyy-MM-dd"),
                    Until: response.DateRange?.Until.ToString("yyyy-MM-dd") ?? effectiveUntil.ToString("yyyy-MM-dd")),
                MetricType: response.MetricType?.ToString().ToLowerInvariant(),
                Breakdown: response.Breakdown,
                Metrics: metricsDict,
                DataDelay: response.DataDelay);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for Instagram account insights, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access Instagram account insights.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for Instagram account insights, account {AccountId}", accountId);
            throw new DomainException(
                "zernio_access_denied",
                "Access denied to this Instagram account.",
                ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for Instagram account insights, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for Instagram account insights, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "instagram",
                "Additional Instagram analytics permissions are required. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for Instagram account insights, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching Instagram account insights for account {AccountId}", accountId);
            throw new DomainException("zernio_instagram_account_insights_error", "Failed to fetch Instagram account insights from Zernio", ex);
        }
    }

    public async Task<ZernioInstagramDemographicsResponseDto> GetInstagramDemographicsAsync(
        string accountId,
        string? metric = null,
        string? breakdown = null,
        string? timeframe = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            throw new ArgumentException("accountId is required.", nameof(accountId));

        try
        {
            var response = await _analyticsApi.GetInstagramDemographicsAsync(
                accountId: accountId,
                metric: metric,
                breakdown: breakdown,
                timeframe: timeframe,
                cancellationToken: cancellationToken);

            var demographics = new Dictionary<string, IReadOnlyList<ZernioInstagramDemographicDimensionDto>>(StringComparer.Ordinal);
            if (response.Demographics != null)
            {
                foreach (var kvp in response.Demographics)
                {
                    demographics[kvp.Key] = (kvp.Value ?? new List<InstagramDemographicsResponseDemographicsValueInner>())
                        .Select(d => new ZernioInstagramDemographicDimensionDto(
                            Dimension: d.Dimension ?? string.Empty,
                            Value: (int)d.Value))
                        .ToList();
                }
            }

            return new ZernioInstagramDemographicsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform?.ToString().ToLowerInvariant() ?? "instagram",
                Metric: response.Metric?.ToString(),
                Timeframe: response.Timeframe?.ToString(),
                Demographics: demographics,
                Note: response.Note);
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio bad request for Instagram demographics, account {AccountId}", accountId);
            throw new ZernioBadRequestException(ex.Message);
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for Instagram demographics, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for Instagram demographics, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access Instagram demographics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for Instagram demographics, account {AccountId}", accountId);
            throw new DomainException(
                "zernio_access_denied",
                "Access denied to this Instagram account.",
                ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for Instagram demographics, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for Instagram demographics, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "instagram",
                "Additional Instagram analytics permissions are required. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching Instagram demographics for account {AccountId}", accountId);
            throw new DomainException("zernio_instagram_demographics_error", "Failed to fetch Instagram demographics from Zernio", ex);
        }
    }

    public async Task<ZernioInstagramAccountInsightsResponseDto> GetInstagramFollowerHistoryAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateInstagramFollowerHistory(
            accountId, metrics, since, until, metricType, cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveSince = DateOnly.TryParse(since, out var parsedSince) ? parsedSince : today.AddDays(-30);
        var effectiveUntil = DateOnly.TryParse(until, out var parsedUntil) ? parsedUntil : today;
        var effectiveMetrics = string.IsNullOrWhiteSpace(metrics)
            ? ZernioAnalyticsValidator.InstagramFollowerHistoryDefaultMetrics
            : metrics;
        var effectiveMetricType = string.IsNullOrWhiteSpace(metricType) ? "total_value" : metricType;

        var config = _analyticsApi.Configuration;
        var baseUrl = config.BasePath.TrimEnd('/');

        var queryParams = new Dictionary<string, string?>
        {
            ["accountId"] = accountId,
            ["metrics"] = effectiveMetrics,
            ["since"] = effectiveSince.ToString("yyyy-MM-dd"),
            ["until"] = effectiveUntil.ToString("yyyy-MM-dd"),
            ["metricType"] = effectiveMetricType
        };

        var query = string.Join("&",
            queryParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/instagram/follower-history?{query}");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

        using var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);
        var httpResponse = await httpClient.SendAsync(request, cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var errorCode = (int)httpResponse.StatusCode;

            if (errorCode == 400)
            {
                _logger.LogWarning("Zernio follower-history bad request. Account: {AccountId}, Error: {Error}", accountId, errorContent);
                throw new ZernioBadRequestException(
                    "Invalid query parameters for Zernio Instagram follower history.",
                    errorCode: "invalid_query_params",
                    details: new { accountId, errorContent });
            }
            if (errorCode == 401)
            {
                _logger.LogWarning("Zernio follower-history unauthorized. Account: {AccountId}", accountId);
                throw new ZernioUnauthorizedException(
                    "Zernio API key is missing or invalid.",
                    details: new { accountId, errorContent });
            }
            if (errorCode == 402)
            {
                _logger.LogWarning("Zernio follower-history billing gate. Account: {AccountId}", accountId);
                throw new ZernioBillingRequiredException(
                    "Analytics add-on is required to access Instagram follower history.",
                    reason: "analytics_addon_required",
                    dashboardUrl: "https://zernio.com/dashboard/billing",
                    details: new { accountId, errorContent });
            }
            if (errorCode == 403)
            {
                _logger.LogWarning("Zernio follower-history access denied. Account: {AccountId}", accountId);
                throw new DomainException(
                    "zernio_access_denied",
                    "Access denied to this Instagram account.",
                    new Exception(errorContent));
            }
            if (errorCode == 404)
            {
                _logger.LogWarning("Zernio follower-history account not found. Account: {AccountId}", accountId);
                throw new ZernioNotFoundException(
                    "Account not found.",
                    resourceType: "social_account",
                    details: new { accountId });
            }
            if (errorCode == 412)
            {
                _logger.LogWarning("Zernio follower-history scope error. Account: {AccountId}", accountId);
                throw new ZernioAnalyticsScopeException(
                    "instagram",
                    "Additional Instagram analytics permissions are required. Re-authorize the connection.",
                    "https://zernio.com/dashboard/analytics/reauth");
            }

            _logger.LogError("Zernio follower-history error. Account: {AccountId}, Status: {StatusCode}, Error: {Error}", accountId, errorCode, errorContent);
            throw new DomainException("zernio_instagram_follower_history_error", $"Failed to fetch Instagram follower history from Zernio. Status: {errorCode}. Error: {errorContent}");
        }

        var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        using var doc = System.Text.Json.JsonDocument.Parse(responseJson);
        var root = doc.RootElement;

        var metricsDict = new Dictionary<string, ZernioInstagramAccountInsightsMetricDto>(StringComparer.Ordinal);
        if (root.TryGetProperty("metrics", out var metricsEl) && metricsEl.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            foreach (var kvp in metricsEl.EnumerateObject())
            {
                var metricObj = kvp.Value;
                decimal total = 0m;
                if (metricObj.TryGetProperty("total", out var totalEl) &&
                    (totalEl.ValueKind == System.Text.Json.JsonValueKind.Number))
                {
                    totalEl.TryGetDecimal(out total);
                }

                IReadOnlyList<ZernioInstagramAccountInsightsValueDto>? values = null;
                if (metricObj.TryGetProperty("values", out var valuesEl) && valuesEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    values = valuesEl.EnumerateArray()
                        .Select(v => new ZernioInstagramAccountInsightsValueDto(
                            Date: v.TryGetProperty("date", out var dEl) && dEl.ValueKind == System.Text.Json.JsonValueKind.String
                                ? dEl.GetString() ?? string.Empty
                                : string.Empty,
                            Value: v.TryGetProperty("value", out var valEl) && valEl.ValueKind == System.Text.Json.JsonValueKind.Number
                                ? (valEl.TryGetDecimal(out var dv) ? dv : 0m)
                                : 0m))
                        .ToList();
                }

                metricsDict[kvp.Name] = new ZernioInstagramAccountInsightsMetricDto(
                    Total: total,
                    Values: values,
                    Breakdowns: null);
            }
        }

        DateOnly responseSince = effectiveSince;
        DateOnly responseUntil = effectiveUntil;
        if (root.TryGetProperty("dateRange", out var drEl) && drEl.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            if (drEl.TryGetProperty("since", out var sEl) && sEl.ValueKind == System.Text.Json.JsonValueKind.String &&
                DateOnly.TryParse(sEl.GetString(), out var parsedS))
            {
                responseSince = parsedS;
            }
            if (drEl.TryGetProperty("until", out var uEl) && uEl.ValueKind == System.Text.Json.JsonValueKind.String &&
                DateOnly.TryParse(uEl.GetString(), out var parsedU))
            {
                responseUntil = parsedU;
            }
        }

        return new ZernioInstagramAccountInsightsResponseDto(
            Success: root.TryGetProperty("success", out var sEl2) && sEl2.ValueKind == System.Text.Json.JsonValueKind.True,
            AccountId: root.TryGetProperty("accountId", out var aEl) && aEl.ValueKind == System.Text.Json.JsonValueKind.String
                ? aEl.GetString() ?? accountId
                : accountId,
            Platform: "instagram",
            DateRange: new ZernioDateRangeDto(
                Since: responseSince.ToString("yyyy-MM-dd"),
                Until: responseUntil.ToString("yyyy-MM-dd")),
            MetricType: root.TryGetProperty("metricType", out var mtEl) && mtEl.ValueKind == System.Text.Json.JsonValueKind.String
                ? mtEl.GetString()
                : effectiveMetricType,
            Breakdown: null,
            Metrics: metricsDict,
            DataDelay: root.TryGetProperty("dataDelay", out var ddEl) && ddEl.ValueKind == System.Text.Json.JsonValueKind.String
                ? ddEl.GetString()
                : null);
    }

    public async Task<ZernioYouTubeDailyViewsResponseDto> GetYouTubeDailyViewsAsync(
        string videoId,
        string accountId,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(videoId))
            throw new ZernioBadRequestException("videoId is required.", "missing_video_id");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStart = startDate ?? today.AddDays(-30);
        var effectiveEnd = endDate ?? today;

        try
        {
            var response = await _analyticsApi.GetYouTubeDailyViewsAsync(
                videoId: videoId,
                accountId: accountId,
                startDate: effectiveStart,
                endDate: effectiveEnd,
                cancellationToken);

            var dailyViews = new List<ZernioYouTubeDailyViewDataDto>();
            if (response.DailyViews != null)
            {
                foreach (var dv in response.DailyViews)
                {
                    dailyViews.Add(new ZernioYouTubeDailyViewDataDto(
                        Date: dv.Date.ToString("yyyy-MM-dd"),
                        Views: dv.Views,
                        EstimatedMinutesWatched: dv.EstimatedMinutesWatched,
                        AverageViewDuration: dv.AverageViewDuration,
                        SubscribersGained: dv.SubscribersGained,
                        SubscribersLost: dv.SubscribersLost,
                        Likes: dv.Likes,
                        Comments: dv.Comments,
                        Shares: dv.Shares));
                }
            }

            return new ZernioYouTubeDailyViewsResponseDto(
                Success: response.Success,
                VideoId: response.VideoId ?? string.Empty,
                DateRange: new ZernioYouTubeDailyViewsDateRangeDto(
                    StartDate: response.DateRange?.StartDate.ToString("yyyy-MM-dd") ?? effectiveStart.ToString("yyyy-MM-dd"),
                    EndDate: response.DateRange?.EndDate.ToString("yyyy-MM-dd") ?? effectiveEnd.ToString("yyyy-MM-dd")),
                TotalViews: response.TotalViews,
                DailyViews: dailyViews,
                LastSyncedAt: response.LastSyncedAt,
                ScopeStatus: response.ScopeStatus != null
                    ? new ZernioYouTubeScopeStatusDto(HasAnalyticsScope: response.ScopeStatus.HasAnalyticsScope)
                    : null);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for YouTube daily views, video {VideoId}", videoId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access YouTube daily views.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { videoId, accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for YouTube daily views, video {VideoId}", videoId);
            throw new DomainException(
                "zernio_access_denied",
                "Access denied to this YouTube account.",
                ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for YouTube daily views, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for YouTube daily views, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "youtube",
                "Additional YouTube analytics permissions are required. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for YouTube daily views, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching YouTube daily views for video {VideoId}", videoId);
            throw new DomainException("zernio_youtube_daily_views_error", "Failed to fetch YouTube daily views from Zernio", ex);
        }
    }

    public async Task<ZernioInstagramAccountInsightsResponseDto> GetYouTubeChannelInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateYouTubeChannelInsights(
            accountId, metrics, since, until, metricType, cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveMetrics = string.IsNullOrWhiteSpace(metrics)
            ? ZernioAnalyticsValidator.YouTubeDefaultMetrics
            : metrics;
        var effectiveSince = DateOnly.TryParse(since, out var parsedSince) ? parsedSince : today.AddDays(-30);
        var effectiveUntil = DateOnly.TryParse(until, out var parsedUntil) ? parsedUntil : today;
        var effectiveMetricType = string.IsNullOrWhiteSpace(metricType) ? "total_value" : metricType;

        try
        {
            var response = await _analyticsApi.GetYouTubeChannelInsightsAsync(
                accountId: accountId,
                metrics: effectiveMetrics,
                since: effectiveSince,
                until: effectiveUntil,
                metricType: effectiveMetricType,
                cancellationToken);

            var metricsDict = new Dictionary<string, ZernioInstagramAccountInsightsMetricDto>(StringComparer.Ordinal);
            if (response.Metrics != null)
            {
                foreach (var kvp in response.Metrics)
                {
                    IReadOnlyList<ZernioInstagramAccountInsightsValueDto>? values = null;
                    if (kvp.Value?.Values != null)
                    {
                        values = kvp.Value.Values
                            .Select(v => new ZernioInstagramAccountInsightsValueDto(
                                Date: v.Date.ToString("yyyy-MM-dd"),
                                Value: v.Value))
                            .ToList();
                    }

                    metricsDict[kvp.Key] = new ZernioInstagramAccountInsightsMetricDto(
                        Total: kvp.Value?.Total ?? 0m,
                        Values: values,
                        Breakdowns: null);
                }
            }

            return new ZernioInstagramAccountInsightsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform?.ToString().ToLowerInvariant() ?? "youtube",
                DateRange: new ZernioDateRangeDto(
                    Since: response.DateRange?.Since.ToString("yyyy-MM-dd") ?? effectiveSince.ToString("yyyy-MM-dd"),
                    Until: response.DateRange?.Until.ToString("yyyy-MM-dd") ?? effectiveUntil.ToString("yyyy-MM-dd")),
                MetricType: effectiveMetricType,
                Breakdown: null,
                Metrics: metricsDict,
                DataDelay: response.DataDelay);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for YouTube channel insights, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access YouTube channel insights.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for YouTube channel insights, account {AccountId}", accountId);
            throw new DomainException(
                "zernio_access_denied",
                "Access denied to this YouTube account.",
                ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for YouTube channel insights, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for YouTube channel insights, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "youtube",
                "Additional YouTube analytics permissions are required. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for YouTube channel insights, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching YouTube channel insights for account {AccountId}", accountId);
            throw new DomainException("zernio_youtube_channel_insights_error", "Failed to fetch YouTube channel insights from Zernio", ex);
        }
    }

    public async Task<ZernioYouTubeDemographicsResponseDto> GetYouTubeDemographicsAsync(
        string accountId,
        string? breakdown = null,
        string? startDate = null,
        string? endDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            throw new ArgumentNullException(nameof(accountId), "accountId is a REQUIRED query param.");

        breakdown ??= "age,gender,country";
        var requestedBreakdowns = breakdown.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                           .Select(b => b.ToLowerInvariant())
                                           .ToList();

        var validBreakdowns = new[] { "age", "gender", "country" };
        var invalidBreakdowns = requestedBreakdowns.Except(validBreakdowns).ToList();
        if (invalidBreakdowns.Any())
        {
            throw new ArgumentException($"Invalid breakdown dimensions: {string.Join(", ", invalidBreakdowns)}. Allowed values: age, gender, country.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var defaultEndDate = today.AddDays(-3);
        var defaultStartDate = defaultEndDate.AddDays(-87);

        var actualEndDate = DateOnly.TryParse(endDate, out var parsedEnd) ? parsedEnd : defaultEndDate;
        var actualStartDate = DateOnly.TryParse(startDate, out var parsedStart) ? parsedStart : defaultStartDate;

        try
        {
            var response = await _analyticsApi.GetYouTubeDemographicsAsync(
                accountId: accountId,
                breakdown: string.Join(",", requestedBreakdowns),
                startDate: actualStartDate,
                endDate: actualEndDate,
                cancellationToken: cancellationToken
            );

            var demographicsDict = new Dictionary<string, IReadOnlyList<ZernioYouTubeDemographicDimensionDto>>(StringComparer.Ordinal);
            if (response.Demographics != null)
            {
                foreach (var kvp in response.Demographics)
                {
                    var dimensionType = kvp.Key.ToLowerInvariant();
                    if (kvp.Value != null)
                    {
                        var dimensionList = new List<ZernioYouTubeDemographicDimensionDto>();
                        foreach (var item in kvp.Value)
                        {
                            double processedValue = (double)item.Value;
                            if (dimensionType is "age" or "gender")
                            {
                                processedValue = Math.Clamp(processedValue, 0, 100);
                            }
                            else if (dimensionType is "country")
                            {
                                processedValue = Math.Round(processedValue);
                            }
                            dimensionList.Add(new ZernioYouTubeDemographicDimensionDto(item.Dimension ?? string.Empty, processedValue));
                        }
                        demographicsDict[kvp.Key] = dimensionList;
                    }
                }
            }

            return new ZernioYouTubeDemographicsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform?.ToString().ToLowerInvariant() ?? "youtube",
                DateRange: new ZernioDateRangeDto(
                    Since: response.DateRange?.StartDate ?? actualStartDate.ToString("yyyy-MM-dd"),
                    Until: response.DateRange?.EndDate ?? actualEndDate.ToString("yyyy-MM-dd")),
                Demographics: demographicsDict,
                Note: response.Note);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for YouTube demographics, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access YouTube demographics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for YouTube demographics, account {AccountId}", accountId);
            throw new DomainException(
                "zernio_access_denied",
                "Access denied to this YouTube account.",
                ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for YouTube demographics, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for YouTube demographics, account {AccountId}", accountId);
            string? reauthUrl = null;
            try
            {
                var errorContentString = ex.ErrorContent?.ToString();
                if (!string.IsNullOrWhiteSpace(errorContentString))
                {
                    var errorBody = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(errorContentString);
                    if (errorBody.TryGetProperty("scopeStatus", out var scopeStatus) &&
                        scopeStatus.TryGetProperty("requiresReauthorization", out var reqAuth) && reqAuth.GetBoolean())
                    {
                        reauthUrl = scopeStatus.TryGetProperty("reauthorizeUrl", out var urlProp) ? urlProp.GetString() : null;
                    }
                }
            }
            catch { }

            throw new ZernioAnalyticsScopeException(
                "youtube",
                "Missing yt-analytics.readonly scope",
                reauthUrl ?? "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for YouTube demographics, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio bad request for YouTube demographics, account {AccountId}", accountId);
            throw new ZernioBadRequestException("Invalid request parameters or non-YouTube account.", "invalid_request");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching YouTube demographics for account {AccountId}", accountId);
            throw new DomainException("zernio_youtube_demographics_error", "Failed to fetch YouTube demographics from Zernio", ex);
        }
    }

    public async Task<ZernioInstagramAccountInsightsResponseDto> GetTikTokAccountInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            throw new ArgumentException("accountId is required.", nameof(accountId));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveMetrics = string.IsNullOrWhiteSpace(metrics)
            ? "follower_count,likes_count,video_count,followers_gained,followers_lost"
            : metrics;
        var effectiveSince = DateOnly.TryParse(since, out var parsedSince) ? parsedSince : today.AddDays(-30);
        var effectiveUntil = DateOnly.TryParse(until, out var parsedUntil) ? parsedUntil : today;
        var effectiveMetricType = string.IsNullOrWhiteSpace(metricType) ? "total_value" : metricType;

        try
        {
            var response = await _analyticsApi.GetTikTokAccountInsightsAsync(
                accountId: accountId,
                metrics: effectiveMetrics,
                since: effectiveSince,
                until: effectiveUntil,
                metricType: effectiveMetricType,
                cancellationToken: cancellationToken);

            var metricsDict = new Dictionary<string, ZernioInstagramAccountInsightsMetricDto>(StringComparer.Ordinal);
            if (response.Metrics != null)
            {
                foreach (var kvp in response.Metrics)
                {
                    IReadOnlyList<ZernioInstagramAccountInsightsValueDto>? values = null;
                    if (kvp.Value?.Values != null)
                    {
                        values = kvp.Value.Values
                            .Select(v => new ZernioInstagramAccountInsightsValueDto(
                                Date: v.Date.ToString("yyyy-MM-dd"),
                                Value: v.Value))
                            .ToList();
                    }

                    metricsDict[kvp.Key] = new ZernioInstagramAccountInsightsMetricDto(
                        Total: kvp.Value?.Total ?? 0m,
                        Values: values,
                        Breakdowns: null);
                }
            }

            return new ZernioInstagramAccountInsightsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform?.ToString().ToLowerInvariant() ?? "tiktok",
                DateRange: new ZernioDateRangeDto(
                    Since: response.DateRange?.Since.ToString("yyyy-MM-dd") ?? effectiveSince.ToString("yyyy-MM-dd"),
                    Until: response.DateRange?.Until.ToString("yyyy-MM-dd") ?? effectiveUntil.ToString("yyyy-MM-dd")),
                MetricType: effectiveMetricType,
                Breakdown: null,
                Metrics: metricsDict,
                DataDelay: response.DataDelay);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for TikTok account insights, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access TikTok account insights.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for TikTok account insights, account {AccountId}", accountId);
            throw new DomainException(
                "zernio_access_denied",
                "Access denied to this TikTok account.",
                ex);
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for TikTok account insights, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for TikTok account insights, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "tiktok",
                "Additional TikTok analytics permissions are required (user.info.stats). Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for TikTok account insights, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching TikTok account insights for account {AccountId}", accountId);
            throw new DomainException("zernio_tiktok_account_insights_error", "Failed to fetch TikTok account insights from Zernio", ex);
        }
    }

    public async Task<ZernioInstagramAccountInsightsResponseDto> GetLinkedInOrgAggregateAnalyticsAsync(
        string accountId,
        string? metrics = null,
        DateOnly? since = null,
        DateOnly? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateLinkedInOrgAggregateAnalytics(
            accountId, metrics, since, until, metricType, cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly effectiveSince;
        DateOnly effectiveUntil;

        if (since.HasValue)
        {
            effectiveSince = since.Value;
        }
        else
        {
            effectiveSince = today.AddDays(-30);
        }

        if (until.HasValue)
        {
            effectiveUntil = until.Value;
        }
        else
        {
            effectiveUntil = today;
        }

        var effectiveMetrics = string.IsNullOrWhiteSpace(metrics)
            ? ZernioAnalyticsValidator.LinkedInOrgDefaultMetrics
            : metrics;
        var effectiveMetricType = string.IsNullOrWhiteSpace(metricType) ? "total_value" : metricType;

        try
        {
            var response = await _analyticsApi.GetLinkedInOrgAggregateAnalyticsAsync(
                accountId: accountId,
                metrics: effectiveMetrics,
                since: effectiveSince,
                until: effectiveUntil,
                metricType: effectiveMetricType,
                cancellationToken: cancellationToken);

            var metricsDict = new Dictionary<string, ZernioInstagramAccountInsightsMetricDto>(StringComparer.Ordinal);
            if (response.Metrics != null)
            {
                foreach (var kvp in response.Metrics)
                {
                    IReadOnlyList<ZernioInstagramAccountInsightsValueDto>? values = null;
                    if (kvp.Value?.Values != null)
                    {
                        values = kvp.Value.Values
                            .Select(v => new ZernioInstagramAccountInsightsValueDto(
                                Date: v.Date.ToString("yyyy-MM-dd"),
                                Value: v.Value))
                            .ToList();
                    }

                    metricsDict[kvp.Key] = new ZernioInstagramAccountInsightsMetricDto(
                        Total: kvp.Value?.Total ?? 0m,
                        Values: values,
                        Breakdowns: null);
                }
            }

            return new ZernioInstagramAccountInsightsResponseDto(
                Success: response.Success,
                AccountId: response.AccountId ?? accountId,
                Platform: response.Platform?.ToString().ToLowerInvariant() ?? "linkedin",
                DateRange: new ZernioDateRangeDto(
                    Since: response.DateRange?.Since.ToString("yyyy-MM-dd") ?? effectiveSince.ToString("yyyy-MM-dd"),
                    Until: response.DateRange?.Until.ToString("yyyy-MM-dd") ?? effectiveUntil.ToString("yyyy-MM-dd")),
                MetricType: response.MetricType?.ToString().ToLowerInvariant(),
                Breakdown: null,
                Metrics: metricsDict,
                DataDelay: response.DataDelay);
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio bad request for LinkedIn org aggregate, account {AccountId}", accountId);
            throw new ZernioBadRequestException(ex.Message);
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for LinkedIn org aggregate, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for LinkedIn org aggregate, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access LinkedIn Org aggregate analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for LinkedIn org aggregate, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "Account not found.",
                resourceType: "social_account",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for LinkedIn org aggregate, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "linkedin",
                "Additional LinkedIn analytics permissions are required. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching LinkedIn org aggregate analytics for account {AccountId}", accountId);
            throw new DomainException("zernio_linkedin_org_aggregate_error", "Failed to fetch LinkedIn Org aggregate analytics from Zernio", ex);
        }
    }

    public async Task<ZernioLinkedInAggregateAnalyticsResponseDto> GetLinkedInAggregateAnalyticsAsync(
        string accountId,
        string? aggregation = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? metrics = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
            accountId,
            aggregation,
            startDate,
            endDate,
            metrics,
            cancellationToken);

        var effAggregation = string.IsNullOrWhiteSpace(aggregation) ? "TOTAL" : aggregation.ToUpperInvariant();

        try
        {
            var response = await _analyticsApi.GetLinkedInAggregateAnalyticsAsync(
                accountId: accountId,
                aggregation: effAggregation,
                startDate: startDate,
                endDate: endDate,
                metrics: metrics,
                cancellationToken: cancellationToken);

            if (response.ActualInstance is Zernio.Model.LinkedInAggregateAnalyticsTotalResponse totalResponse)
            {
                ZernioLinkedInAggregateAnalyticsDateRangeDto? dateRangeDto = null;
                if (totalResponse.DateRange != null)
                {
                    dateRangeDto = new ZernioLinkedInAggregateAnalyticsDateRangeDto(
                        totalResponse.DateRange.StartDate.ToString("yyyy-MM-dd"),
                        totalResponse.DateRange.EndDate.ToString("yyyy-MM-dd")
                    );
                }

                ZernioLinkedInAggregateAnalyticsDataDto? analyticsDto = null;
                if (totalResponse.Analytics != null)
                {
                    analyticsDto = new ZernioLinkedInAggregateAnalyticsDataDto(
                        Impressions: totalResponse.Analytics.Impressions,
                        Reach: totalResponse.Analytics.Reach,
                        Reactions: totalResponse.Analytics.Reactions,
                        Comments: totalResponse.Analytics.Comments,
                        Shares: totalResponse.Analytics.Shares,
                        Saves: totalResponse.Analytics.Saves,
                        Sends: totalResponse.Analytics.Sends,
                        EngagementRate: totalResponse.Analytics.EngagementRate
                    );
                }

                return new ZernioLinkedInAggregateAnalyticsResponseDto(
                    AccountId: totalResponse.AccountId ?? string.Empty,
                    Platform: totalResponse.Platform ?? "linkedin",
                    AccountType: totalResponse.AccountType ?? "personal",
                    Username: totalResponse.Username ?? string.Empty,
                    Aggregation: "TOTAL",
                    DateRange: dateRangeDto,
                    AnalyticsTotal: analyticsDto,
                    AnalyticsDaily: null,
                    SkippedMetrics: null,
                    Note: totalResponse.Note,
                    LastUpdated: totalResponse.LastUpdated
                );
            }
            else if (response.ActualInstance is Zernio.Model.LinkedInAggregateAnalyticsDailyResponse dailyResponse)
            {
                ZernioLinkedInAggregateAnalyticsDateRangeDto? dateRangeDto = null;
                if (dailyResponse.DateRange != null)
                {
                    dateRangeDto = new ZernioLinkedInAggregateAnalyticsDateRangeDto(
                        dailyResponse.DateRange.StartDate.ToString("yyyy-MM-dd"),
                        dailyResponse.DateRange.EndDate.ToString("yyyy-MM-dd")
                    );
                }

                ZernioLinkedInAggregateAnalyticsDailyDataDto? analyticsDto = null;
                if (dailyResponse.Analytics != null)
                {
                    analyticsDto = new ZernioLinkedInAggregateAnalyticsDailyDataDto(
                        Impressions: dailyResponse.Analytics.Impressions?
                            .Select(i => new ZernioLinkedInAggregateAnalyticsDailyPointDto(i.Date.ToString("yyyy-MM-dd"), i.Count))
                            .ToList(),
                        Reach: null,
                        Reactions: dailyResponse.Analytics.Reactions?
                            .Select(i => new ZernioLinkedInAggregateAnalyticsDailyPointDto(i.Date.ToString("yyyy-MM-dd"), i.Count))
                            .ToList(),
                        Comments: dailyResponse.Analytics.Comments?
                            .Select(i => new ZernioLinkedInAggregateAnalyticsDailyPointDto(i.Date.ToString("yyyy-MM-dd"), i.Count))
                            .ToList(),
                        Shares: dailyResponse.Analytics.Shares?
                            .Select(i => new ZernioLinkedInAggregateAnalyticsDailyPointDto(i.Date.ToString("yyyy-MM-dd"), i.Count))
                            .ToList(),
                        Saves: dailyResponse.Analytics.Saves?
                            .Select(i => new ZernioLinkedInAggregateAnalyticsDailyPointDto(i.Date.ToString("yyyy-MM-dd"), i.Count))
                            .ToList(),
                        Sends: dailyResponse.Analytics.Sends?
                            .Select(i => new ZernioLinkedInAggregateAnalyticsDailyPointDto(i.Date.ToString("yyyy-MM-dd"), i.Count))
                            .ToList()
                    );
                }

                return new ZernioLinkedInAggregateAnalyticsResponseDto(
                    AccountId: dailyResponse.AccountId ?? string.Empty,
                    Platform: dailyResponse.Platform ?? "linkedin",
                    AccountType: dailyResponse.AccountType ?? "personal",
                    Username: dailyResponse.Username ?? string.Empty,
                    Aggregation: "DAILY",
                    DateRange: dateRangeDto,
                    AnalyticsTotal: null,
                    AnalyticsDaily: analyticsDto,
                    SkippedMetrics: dailyResponse.SkippedMetrics,
                    Note: dailyResponse.Note,
                    LastUpdated: dailyResponse.LastUpdated
                );
            }

            throw new DomainException("zernio_linkedin_aggregate_analytics_error", "Unknown response type from Zernio");
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio invalid request for LinkedIn aggregate analytics, account {AccountId}", accountId);
            throw new ZernioBadRequestException(
                "Invalid request parameters for LinkedIn aggregate analytics.",
                ex,
                errorCode: "zernio_bad_request");
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for LinkedIn aggregate analytics, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access LinkedIn aggregate analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for LinkedIn aggregate analytics, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "linkedin",
                "Access denied to LinkedIn aggregate analytics due to missing scope or invalid authorization.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account not found for LinkedIn aggregate analytics, account {AccountId}", accountId);
            throw new ZernioNotFoundException(
                "LinkedIn account not found.",
                ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching LinkedIn aggregate analytics for account {AccountId}", accountId);
            throw new DomainException("zernio_linkedin_aggregate_analytics_error", "Failed to fetch LinkedIn aggregate analytics from Zernio", ex);
        }
    }

    public async Task<ZernioLinkedInPostAnalyticsResponseDto> GetLinkedInPostAnalyticsAsync(
        string accountId,
        string urn,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            throw new ArgumentException("accountId is required.", nameof(accountId));
        if (string.IsNullOrWhiteSpace(urn))
            throw new ArgumentException("urn is required.", nameof(urn));

        try
        {
            var response = await _analyticsApi.GetLinkedInPostAnalyticsAsync(
                accountId: accountId,
                urn: urn,
                cancellationToken: cancellationToken);

            ZernioLinkedInPostAnalyticsDataDto? analyticsDto = null;
            if (response.Analytics != null)
            {
                analyticsDto = new ZernioLinkedInPostAnalyticsDataDto(
                    Impressions: response.Analytics.Impressions,
                    Reach: response.Analytics.Reach,
                    Likes: response.Analytics.Likes,
                    Comments: response.Analytics.Comments,
                    Shares: response.Analytics.Shares,
                    Saves: response.Analytics.Saves,
                    Sends: response.Analytics.Sends,
                    Clicks: response.Analytics.Clicks,
                    Views: response.Analytics.Views,
                    EngagementRate: response.Analytics.EngagementRate
                );
            }

            return new ZernioLinkedInPostAnalyticsResponseDto(
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform ?? "linkedin",
                AccountType: response.AccountType?.ToString() ?? "personal",
                Username: response.Username ?? string.Empty,
                PostUrn: response.PostUrn ?? string.Empty,
                Analytics: analyticsDto,
                LastUpdated: response.LastUpdated
            );
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio invalid request for LinkedIn post analytics, account {AccountId}, urn {Urn}", accountId, urn);
            throw new ZernioBadRequestException(
                "Invalid request parameters for LinkedIn post analytics.",
                ex,
                errorCode: "zernio_bad_request");
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for LinkedIn post analytics, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access LinkedIn post analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for LinkedIn post analytics, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "linkedin",
                "Access denied to LinkedIn post analytics due to missing scope or invalid authorization.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account or post not found for LinkedIn post analytics, account {AccountId}, urn {Urn}", accountId, urn);
            throw new ZernioNotFoundException(
                "LinkedIn account or post not found.",
                ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching LinkedIn post analytics for account {AccountId}, urn {Urn}", accountId, urn);
            throw new DomainException("zernio_linkedin_post_analytics_error", "Failed to fetch LinkedIn post analytics from Zernio", ex);
        }
    }

    public async Task<ZernioLinkedInPostReactionsResponseDto> GetLinkedInPostReactionsAsync(
        string accountId,
        string urn,
        int? limit = null,
        string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateLinkedInPostReactions(accountId, urn, limit, cancellationToken);

        var clampedLimit = Math.Clamp(limit ?? 25, 1, 100);

        try
        {
            var response = await _analyticsApi.GetLinkedInPostReactionsAsync(
                accountId, urn, clampedLimit, cursor, cancellationToken);

            var accountType = response.AccountType?.ToString() ?? string.Empty;
            if (string.Equals(accountType, "personal", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("LinkedIn post reactions requested for personal account {AccountId}", accountId);
                throw new DomainException("zernio_access_denied",
                    "LinkedIn post reactions are only available for Organization / LinkedIn Page accounts.");
            }

            var reactions = response.Reactions?
                .Select(r => new ZernioLinkedInPostReactionDto(
                    ReactionType: r.ReactionType?.ToString() ?? string.Empty,
                    ReactionLabel: r.ReactionLabel,
                    ReactedAt: r.ReactedAt,
                    From: r.From != null
                        ? new ZernioLinkedInPostReactionAuthorDto(
                            Urn: r.From.Urn ?? string.Empty,
                            Name: r.From.Name,
                            Headline: r.From.Headline,
                            Username: r.From.Username,
                            ProfilePicture: r.From.ProfilePicture,
                            ProfileUrl: r.From.ProfileUrl)
                        : null))
                .ToList() as IReadOnlyList<ZernioLinkedInPostReactionDto>;

            ZernioLinkedInPostReactionsPaginationDto? pagination = null;
            if (response.Pagination != null)
            {
                var hasTotal = response.Pagination.Total != 0
                    || response.Pagination.HasMore
                    || !string.IsNullOrEmpty(response.Pagination.Cursor);
                pagination = new ZernioLinkedInPostReactionsPaginationDto(
                    HasMore: response.Pagination.HasMore,
                    Cursor: response.Pagination.Cursor,
                    Total: response.Pagination.Total,
                    HasTotal: hasTotal);
            }

            return new ZernioLinkedInPostReactionsResponseDto(
                AccountId: response.AccountId ?? string.Empty,
                Platform: response.Platform ?? "linkedin",
                AccountType: accountType,
                Username: response.Username ?? string.Empty,
                PostUrn: response.PostUrn ?? string.Empty,
                Reactions: reactions,
                Pagination: pagination,
                LastUpdated: response.LastUpdated);
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            var errorCode = TryParseErrorCode(ex.ErrorContent?.ToString()) ?? "zernio_bad_request";
            _logger.LogWarning(ex, "Zernio bad request for LinkedIn post reactions, account {AccountId}", accountId);
            throw new ZernioBadRequestException(
                "Invalid request for LinkedIn post reactions.",
                ex,
                errorCode: errorCode);
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for LinkedIn post reactions, account {AccountId}", accountId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid.",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for LinkedIn post reactions, account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to access LinkedIn post reactions.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            _logger.LogWarning(ex, "Zernio access denied for LinkedIn post reactions, account {AccountId}", accountId);
            throw new ZernioAnalyticsScopeException(
                "linkedin",
                "Access denied to LinkedIn post reactions due to missing scope or invalid authorization.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio account or post not found for LinkedIn post reactions, account {AccountId}, urn {Urn}", accountId, urn);
            throw new ZernioNotFoundException(
                "LinkedIn account or post not found.",
                ex);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching LinkedIn post reactions for account {AccountId}, urn {Urn}", accountId, urn);
            throw new DomainException("zernio_linkedin_post_reactions_error", "Failed to fetch LinkedIn post reactions from Zernio", ex);
        }
    }

    public async Task<ZernioPostingFrequencyResponseDto> GetPostingFrequencyAsync(
        string? platform = null,
        string? profileId = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default)
    {
        if (source is not null && !AllowedSources.Contains(source))
            throw new ArgumentException($"Invalid source '{source}'. Allowed values: {string.Join(", ", AllowedSources)}", nameof(source));

        try
        {
            var response = await _analyticsApi.GetPostingFrequencyAsync(
                platform: platform,
                profileId: profileId,
                accountId: accountId,
                source: source,
                cancellationToken);

            var frequency = (response.Frequency ?? [])
                .Select(f => new ZernioPostingFrequencyItemDto(
                    Platform: f.Platform ?? string.Empty,
                    PostsPerWeek: f.PostsPerWeek,
                    AvgEngagementRate: f.AvgEngagementRate,
                    AvgEngagement: f.AvgEngagement,
                    WeeksCount: f.WeeksCount))
                .ToList();

            return new ZernioPostingFrequencyResponseDto(frequency);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate (402) for posting-frequency, profile {ProfileId}", profileId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access posting frequency analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { profileId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            var requiresAddon = TryParseRequiresAddon(ex.ErrorContent?.ToString());
            if (requiresAddon)
            {
                _logger.LogWarning(ex, "Zernio billing gate (403 requiresAddon) for posting-frequency, profile {ProfileId}", profileId);
                throw new ZernioBillingRequiredException(
                    "Analytics add-on is required to access posting frequency analytics.",
                    reason: "analytics_addon_required",
                    dashboardUrl: "https://zernio.com/dashboard/billing",
                    details: new { profileId, accountId, source });
            }

            _logger.LogWarning(ex, "Zernio 403 Forbidden for posting-frequency, profile {ProfileId}", profileId);
            throw new ZernioUnauthorizedException(
                "Zernio returned 403 Forbidden for posting frequency analytics. Check account permissions.",
                details: new { profileId, platform, accountId, source });
        }
        catch (ApiException ex) when (ex.ErrorCode == 412)
        {
            _logger.LogWarning(ex, "Zernio analytics scope error for posting-frequency, profile {ProfileId}", profileId);
            throw new ZernioAnalyticsScopeException(
                platform ?? "unknown",
                "Additional analytics permissions are required for posting frequency data. Re-authorize the connection.",
                "https://zernio.com/dashboard/analytics/reauth");
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching posting-frequency for profile {ProfileId}", profileId);
            throw new DomainException("zernio_posting_frequency_error", "Failed to fetch posting frequency analytics from Zernio", ex);
        }
    }

    public async Task<ZernioPostTimelineResponseDto> GetPostTimelineAsync(
        string postId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateSinglePost(postId, cancellationToken);

        var effectiveFrom = fromDate ?? DateTime.UtcNow.AddDays(-90);
        var effectiveTo = toDate ?? DateTime.UtcNow;

        try
        {
            var response = await _analyticsApi.GetPostTimelineAsync(
                postId: postId,
                fromDate: effectiveFrom,
                toDate: effectiveTo,
                cancellationToken);

            var timeline = (response.Timeline ?? [])
                .Select(t => new ZernioPostTimelineItemDto(
                    Date: t.Date.ToString("yyyy-MM-dd"),
                    Platform: t.Platform ?? string.Empty,
                    PlatformPostId: t.PlatformPostId ?? string.Empty,
                    Impressions: t.Impressions,
                    Reach: t.Reach,
                    Likes: t.Likes,
                    Comments: t.Comments,
                    Shares: t.Shares,
                    Saves: t.Saves,
                    Clicks: t.Clicks,
                    Views: t.Views))
                .ToList();

            return new ZernioPostTimelineResponseDto(timeline);
        }
        catch (ApiException ex) when (ex.ErrorCode == 400)
        {
            _logger.LogWarning(ex, "Zernio bad request for post-timeline, postId {PostId}", postId);
            throw new ZernioBadRequestException(
                "Invalid request for post timeline analytics.",
                errorCode: "invalid_post_timeline_request",
                details: new { postId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 401)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for post-timeline, postId {PostId}", postId);
            throw new ZernioUnauthorizedException(
                "Zernio API key is missing or invalid for post timeline analytics.",
                details: new { postId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate (402) for post-timeline, postId {PostId}", postId);
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access post timeline analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { postId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 403)
        {
            var requiresAddon = TryParseRequiresAddon(ex.ErrorContent?.ToString());
            if (requiresAddon)
            {
                _logger.LogWarning(ex, "Zernio billing gate (403 requiresAddon) for post-timeline, postId {PostId}", postId);
                throw new ZernioBillingRequiredException(
                    "Analytics add-on is required to access post timeline analytics.",
                    reason: "analytics_addon_required",
                    dashboardUrl: "https://zernio.com/dashboard/billing",
                    details: new { postId });
            }

            _logger.LogWarning(ex, "Zernio 403 Forbidden for post-timeline, postId {PostId}", postId);
            throw new ZernioUnauthorizedException(
                "Zernio returned 403 Forbidden for post timeline analytics.",
                details: new { postId });
        }
        catch (ApiException ex) when (ex.ErrorCode == 404)
        {
            _logger.LogWarning(ex, "Zernio not-found for post-timeline, postId {PostId}", postId);
            throw new ZernioNotFoundException(
                "Post not found for timeline analytics.",
                details: new { postId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error fetching post-timeline for postId {PostId}", postId);
            throw new DomainException("zernio_post_timeline_error", "Failed to fetch post timeline analytics from Zernio", ex);
        }
    }

    public async Task<ZernioPostAnalyticsDto> GetPostAnalyticsAsync(
        string postId,
        string? platform = null,
        string? profileId = null,
        string? accountId = null,
        string? source = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        int? limit = null,
        int? page = null,
        string? sortBy = null,
        string? order = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateSinglePost(postId, cancellationToken);
        ZernioAnalyticsValidator.Validate(
            postId: postId,
            platform: platform,
            profileId: profileId,
            accountId: accountId,
            source: source,
            fromDate: fromDate,
            toDate: toDate,
            limit: limit,
            page: page,
            sortBy: sortBy,
            order: order);

        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');
            var queryParams = new Dictionary<string, string?>
            {
                ["postId"] = postId,
                ["platform"] = platform,
                ["profileId"] = profileId,
                ["accountId"] = accountId,
                ["source"] = source,
                ["fromDate"] = fromDate?.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["limit"] = limit?.ToString(),
                ["page"] = page?.ToString(),
                ["sortBy"] = sortBy,
                ["order"] = order
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 400)
                {
                    _logger.LogWarning("Zernio analytics bad request for post {PostId}", postId);
                    throw new ZernioBadRequestException(
                        "Invalid query parameters for Zernio analytics.",
                        errorCode: "invalid_query_params",
                        details: new { postId, errorContent });
                }
                if (errorCode == 401)
                {
                    _logger.LogWarning("Zernio analytics unauthorized for post {PostId}", postId);
                    throw new ZernioUnauthorizedException(
                        "Zernio API key is missing or invalid.",
                        details: new { postId, errorContent });
                }
                if (errorCode == 402)
                {
                    _logger.LogWarning("Zernio analytics billing gate for post {PostId}", postId);
                    throw new ZernioBillingRequiredException(
                        "Analytics add-on is required to access Zernio post analytics.",
                        reason: "analytics_addon_required",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { postId, errorContent });
                }
                if (errorCode == 404)
                {
                    _logger.LogWarning("Zernio post not found: {PostId}", postId);
                    throw new ZernioNotFoundException(
                        $"Zernio post '{postId}' was not found.",
                        resourceType: "post",
                        details: new { postId, errorContent });
                }
                if (errorCode == 424)
                {
                    _logger.LogWarning("Zernio post failed on all platforms: {PostId}", postId);
                    throw new ZernioServerException(
                        "Post failed to publish on all platforms; analytics are unavailable.",
                        statusCode: 424,
                        details: new { postId, errorContent });
                }
                if (errorCode >= 500)
                {
                    _logger.LogError("Zernio server error fetching post analytics for {PostId}. Status: {StatusCode}, Error: {Error}", postId, errorCode, errorContent);
                    throw new ZernioServerException(
                        "Zernio server error while fetching post analytics.",
                        statusCode: errorCode,
                        details: new { postId, errorContent });
                }

                _logger.LogError("Zernio API error fetching post analytics for {PostId}. Status: {StatusCode}, Error: {Error}", postId, errorCode, errorContent);
                throw new DomainException("zernio_post_analytics_error", $"Failed to fetch post analytics from Zernio. Status: {errorCode}. Error: {errorContent}");
            }

            var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var rawResponse = System.Text.Json.JsonSerializer.Deserialize<ZernioRawAnalyticsSinglePostResponse>(responseJson, _jsonOptions);

            return MapSinglePostRaw(rawResponse);
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioBadRequestException) { throw; }
        catch (ZernioUnauthorizedException) { throw; }
        catch (ZernioNotFoundException) { throw; }
        catch (ZernioServerException) { throw; }
        catch (DomainException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching post analytics for {PostId}", postId);
            throw new DomainException("zernio_post_analytics_error", "Failed to fetch post analytics from Zernio", ex);
        }
    }

    public async Task<ZernioPostAnalyticsListDto> GetAnalyticsListAsync(
        string? platform = null,
        string? profileId = null,
        string? accountId = null,
        string? source = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        int? limit = null,
        int? page = null,
        string? sortBy = null,
        string? order = null,
        CancellationToken cancellationToken = default)
    {
        ZernioAnalyticsValidator.ValidateListRequest(
            platform: platform,
            profileId: profileId,
            accountId: accountId,
            source: source,
            fromDate: fromDate,
            toDate: toDate,
            limit: limit,
            page: page,
            sortBy: sortBy,
            order: order,
            cancellationToken: cancellationToken);

        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');
            var queryParams = new Dictionary<string, string?>
            {
                ["platform"] = platform,
                ["profileId"] = profileId,
                ["accountId"] = accountId,
                ["source"] = source,
                ["fromDate"] = fromDate?.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["limit"] = limit?.ToString(),
                ["page"] = page?.ToString(),
                ["sortBy"] = sortBy,
                ["order"] = order
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                var errorCode = (int)httpResponse.StatusCode;

                if (errorCode == 400)
                {
                    _logger.LogWarning("Zernio analytics list bad request: {Error}", errorContent);
                    throw new ZernioBadRequestException(
                        "Invalid query parameters for Zernio analytics list.",
                        errorCode: "invalid_query_params",
                        details: new { errorContent });
                }
                if (errorCode == 401)
                {
                    _logger.LogWarning("Zernio analytics list unauthorized: {Error}", errorContent);
                    throw new ZernioUnauthorizedException(
                        "Zernio API key is missing or invalid.",
                        details: new { errorContent });
                }
                if (errorCode == 402)
                {
                    _logger.LogWarning("Zernio analytics list billing gate: {Error}", errorContent);
                    throw new ZernioBillingRequiredException(
                        "Analytics add-on is required to access Zernio post analytics.",
                        reason: "analytics_addon_required",
                        dashboardUrl: "https://zernio.com/dashboard/billing",
                        details: new { errorContent });
                }
                if (errorCode == 404)
                {
                    _logger.LogWarning("Zernio analytics list not found: {Error}", errorContent);
                    throw new ZernioNotFoundException(
                        "No matching analytics data was found for the given filters.",
                        resourceType: "analytics",
                        details: new { errorContent });
                }
                if (errorCode >= 500)
                {
                    _logger.LogError("Zernio server error fetching analytics list. Status: {StatusCode}, Error: {Error}", errorCode, errorContent);
                    throw new ZernioServerException(
                        "Zernio server error while fetching analytics list.",
                        statusCode: errorCode,
                        details: new { errorContent });
                }

                _logger.LogError("Zernio API error fetching analytics list. Status: {StatusCode}, Error: {Error}", errorCode, errorContent);
                throw new DomainException("zernio_analytics_list_error", $"Failed to fetch analytics list from Zernio. Status: {errorCode}. Error: {errorContent}");
            }

            var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var rawResponse = System.Text.Json.JsonSerializer.Deserialize<ZernioRawAnalyticsListResponse>(responseJson, _jsonOptions);

            return MapListRaw(rawResponse);
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioBadRequestException) { throw; }
        catch (ZernioUnauthorizedException) { throw; }
        catch (ZernioNotFoundException) { throw; }
        catch (ZernioServerException) { throw; }
        catch (DomainException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching analytics list");
            throw new DomainException("zernio_analytics_list_error", "Failed to fetch analytics list from Zernio", ex);
        }
    }

    private static DateTime? ParseZernioDate(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;
        if (DateTime.TryParse(dateStr, out var dt)) return dt;
        return null;
    }

    private ZernioPostAnalyticsDto MapSinglePostRaw(ZernioRawAnalyticsSinglePostResponse? src)
    {
        if (src is null)
        {
            return new ZernioPostAnalyticsDto();
        }

        var fields = src.Analytics != null
            ? new PostAnalyticsFields(
                src.Analytics.Impressions ?? 0,
                src.Analytics.Reach ?? 0,
                src.Analytics.Likes ?? 0,
                src.Analytics.Comments ?? 0,
                src.Analytics.Shares ?? 0,
                src.Analytics.Saves ?? 0,
                src.Analytics.Clicks ?? 0,
                src.Analytics.Views ?? 0,
                src.Analytics.EngagementRate ?? 0m,
                ParseZernioDate(src.Analytics.LastUpdated))
            : null;

        var platformAnalytics = src.PlatformAnalytics?
            .Select(p => new ZernioPlatformPostMetricsDto(
                Platform: p.Platform,
                Status: p.Status,
                PlatformPostId: p.PlatformPostId,
                AccountId: p.AccountId,
                AccountUsername: p.AccountUsername,
                Analytics: p.Analytics != null
                    ? new PostAnalyticsFields(
                        p.Analytics.Impressions ?? 0,
                        p.Analytics.Reach ?? 0,
                        p.Analytics.Likes ?? 0,
                        p.Analytics.Comments ?? 0,
                        p.Analytics.Shares ?? 0,
                        p.Analytics.Saves ?? 0,
                        p.Analytics.Clicks ?? 0,
                        p.Analytics.Views ?? 0,
                        p.Analytics.EngagementRate ?? 0m,
                        ParseZernioDate(p.Analytics.LastUpdated))
                    : null,
                SyncStatus: p.SyncStatus,
                PlatformPostUrl: p.PlatformPostUrl,
                ErrorMessage: p.ErrorMessage))
            .ToList();

        var mediaItems = src.MediaItems?
            .Select(m => new ZernioPostMediaItemDto(
                Type: m.Type,
                Url: m.Url,
                Thumbnail: m.Thumbnail))
            .ToList();

        return new ZernioPostAnalyticsDto(
            PostId: src.PostId,
            LatePostId: src.LatePostId,
            Status: src.Status,
            Content: src.Content,
            ScheduledFor: src.ScheduledFor,
            PublishedAt: src.PublishedAt,
            Analytics: fields ?? new PostAnalyticsFields(),
            PlatformAnalytics: platformAnalytics?.Count > 0 ? platformAnalytics : null,
            Platform: src.Platform,
            PlatformPostUrl: src.PlatformPostUrl,
            IsExternal: src.IsExternal,
            SyncStatus: src.SyncStatus,
            Message: src.Message,
            ThumbnailUrl: src.ThumbnailUrl,
            MediaType: src.MediaType,
            MediaItems: mediaItems?.Count > 0 ? mediaItems : null);
    }

    private ZernioPostAnalyticsListDto MapListRaw(ZernioRawAnalyticsListResponse? src)
    {
        if (src is null)
        {
            return new ZernioPostAnalyticsListDto();
        }

        ZernioAnalyticsOverviewDto? overview = null;
        if (src.Overview != null)
        {
            ZernioAnalyticsDataStalenessDto? staleness = null;
            if (src.Overview.DataStaleness != null)
            {
                staleness = new ZernioAnalyticsDataStalenessDto(
                    StaleAccountCount: src.Overview.DataStaleness.StaleAccountCount,
                    SyncTriggered: src.Overview.DataStaleness.SyncTriggered);
            }
            overview = new ZernioAnalyticsOverviewDto(
                TotalPosts: src.Overview.TotalPosts,
                PublishedPosts: src.Overview.PublishedPosts,
                ScheduledPosts: src.Overview.ScheduledPosts,
                LastSync: src.Overview.LastSync,
                DataStaleness: staleness);
        }

        var posts = src.Posts?
            .Select(p => new ZernioAnalyticsListPostDto(
                Id: p._Id ?? "",
                LatePostId: p.LatePostId,
                Content: p.Content,
                ScheduledFor: p.ScheduledFor,
                PublishedAt: p.PublishedAt,
                Status: p.Status,
                Analytics: p.Analytics != null
                    ? new PostAnalyticsFields(
                        p.Analytics.Impressions ?? 0,
                        p.Analytics.Reach ?? 0,
                        p.Analytics.Likes ?? 0,
                        p.Analytics.Comments ?? 0,
                        p.Analytics.Shares ?? 0,
                        p.Analytics.Saves ?? 0,
                        p.Analytics.Clicks ?? 0,
                        p.Analytics.Views ?? 0,
                        p.Analytics.EngagementRate ?? 0m,
                        ParseZernioDate(p.Analytics.LastUpdated))
                    : null,
                Platforms: p.Platforms?.Select(MapPlatformRaw).ToList(),
                Platform: p.Platform,
                PlatformPostUrl: p.PlatformPostUrl,
                IsExternal: p.IsExternal,
                ProfileId: p.ProfileId,
                ThumbnailUrl: p.ThumbnailUrl,
                MediaType: p.MediaType,
                MediaItems: p.MediaItems?
                    .Select(m => new ZernioPostMediaItemDto(
                        Type: m.Type,
                        Url: m.Url,
                        Thumbnail: m.Thumbnail))
                    .ToList()))
            .ToList();

        var pagination = src.Pagination != null
            ? new ZernioAnalyticsPaginationDto(
                Page: src.Pagination.Page,
                Limit: src.Pagination.Limit,
                Total: src.Pagination.Total,
                Pages: src.Pagination.Pages)
            : null;

        var accounts = src.Accounts?
            .Select(a => new ZernioAccountDto(
                Id: a._Id ?? "",
                Platform: a.Platform ?? "",
                DisplayName: a.DisplayName ?? "",
                IsConnected: true,
                ProfilePicture: a.ProfilePicture,
                ProfileUrl: null,
                Username: a.Username,
                ProfileId: a.ProfileId,
                FollowersCount: a.FollowersCount,
                FollowersLastUpdated: a.FollowersLastUpdated,
                ParentAccountId: null,
                Enabled: null))
            .ToList();

        return new ZernioPostAnalyticsListDto(
            Overview: overview,
            Posts: posts,
            Pagination: pagination,
            Accounts: accounts,
            HasAnalyticsAccess: src.HasAnalyticsAccess);
    }

    private static ZernioPlatformPostMetricsDto MapPlatformRaw(ZernioRawPlatformPostMetrics p) =>
        new(
            Platform: p.Platform ?? "",
            Status: p.Status,
            PlatformPostId: p.PlatformPostId,
            AccountId: p.AccountId,
            AccountUsername: p.AccountUsername,
            Analytics: p.Analytics != null
                ? new PostAnalyticsFields(
                    p.Analytics.Impressions ?? 0,
                    p.Analytics.Reach ?? 0,
                    p.Analytics.Likes ?? 0,
                    p.Analytics.Comments ?? 0,
                    p.Analytics.Shares ?? 0,
                    p.Analytics.Saves ?? 0,
                    p.Analytics.Clicks ?? 0,
                    p.Analytics.Views ?? 0,
                    p.Analytics.EngagementRate ?? 0m,
                    ParseZernioDate(p.Analytics.LastUpdated))
                : null,
            SyncStatus: p.SyncStatus,
            PlatformPostUrl: p.PlatformPostUrl,
            ErrorMessage: p.ErrorMessage);

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

            await EnrichFacebookPagesWithAvatarsAsync(pages, accountId, cancellationToken);

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

    private async Task EnrichFacebookPagesWithAvatarsAsync(
        List<ZernioFacebookPageDto> pages,
        string accountId,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Zernio");
            var response = await client.GetAsync($"/v1/accounts/{accountId}", cancellationToken);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var metadata = root.TryGetProperty("account", out var accountEl)
                ? accountEl.TryGetProperty("metadata", out var metaEl) ? metaEl : default
                : root.TryGetProperty("metadata", out var m) ? m : default;

            if (metadata.ValueKind != JsonValueKind.Object) return;

            if (!metadata.TryGetProperty("availablePages", out var aPagesEl)) return;
            if (aPagesEl.ValueKind != JsonValueKind.Array) return;

            var pictureMap = new Dictionary<string, string?>(StringComparer.Ordinal);
            foreach (var pageEl in aPagesEl.EnumerateArray())
            {
                var id = pageEl.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                var pictureUrl = pageEl.TryGetProperty("picture", out var picEl)
                    && picEl.TryGetProperty("data", out var dataEl)
                    && dataEl.TryGetProperty("url", out var urlEl)
                    ? urlEl.GetString() : null;
                if (id is not null)
                    pictureMap[id] = pictureUrl;
            }

            if (pictureMap.Count == 0) return;

            for (var i = 0; i < pages.Count; i++)
            {
                var p = pages[i];
                if (pictureMap.TryGetValue(p.Id, out var pic) && pic is not null)
                {
                    pages[i] = new ZernioFacebookPageDto(p.Id, p.Name, p.Username, p.Category, p.FanCount, pic);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enrich Facebook pages with avatars for account {AccountId}. Continuing without avatars.", accountId);
        }
    }

    public async Task<ZernioFacebookPageDto?> UpdateFacebookPageAsync(
        string accountId,
        string selectedPageId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new UpdateFacebookPageRequest(selectedPageId);
            var response = await _connectApi.UpdateFacebookPageAsync(accountId, request, cancellationToken);
            if (response?.SelectedPage is not null)
            {
                return new ZernioFacebookPageDto(
                    response.SelectedPage.Id,
                    response.SelectedPage.Name,
                    null, null, null);
            }
            return null;
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



    public async Task<ZernioLinkedInMentionsResponseDto> GetLinkedInMentionsAsync(
        string accountId,
        string url,
        string? displayName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _linkedInMentionsApi.GetLinkedInMentionsAsync(accountId, url, displayName, cancellationToken);
            return new ZernioLinkedInMentionsResponseDto(
                Urn: response.Urn,
                Type: response.Type?.ToString(),
                DisplayName: response.DisplayName,
                MentionFormat: response.MentionFormat,
                VanityName: response.VanityName,
                Warning: response.Warning
            );
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error getting LinkedIn mentions for account {AccountId} and URL {Url}", accountId, url);
            throw new DomainException("zernio_linkedin_mentions_error", $"Failed to resolve LinkedIn mentions: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error getting LinkedIn mentions for account {AccountId} and URL {Url}", accountId, url);
            throw;
        }
    }

    public async Task<ZernioLinkedInOrganizationsResponseDto> GetLinkedInOrganizationsAsync(
        string accountId,
        bool? refresh = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _connectApi.GetLinkedInOrganizationsAsync(accountId, cancellationToken);

            var organizations = (response?.Organizations ?? new List<Zernio.Model.GetLinkedInOrganizations200ResponseOrganizationsInner>())
                .Select(o => new ZernioLinkedInOrganizationDto(
                    o.Id ?? string.Empty,
                    o.Name ?? string.Empty,
                    o.VanityName,
                    null))
                .ToList();

            return new ZernioLinkedInOrganizationsResponseDto(
                organizations,
                null,
                false);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing LinkedIn organizations for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to manage LinkedIn organizations.",
                reason: "linkedin_organizations_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error listing LinkedIn organizations for account {AccountId}", accountId);
            throw new DomainException("zernio_linkedin_organizations_error", "Failed to list LinkedIn organizations", ex);
        }
    }

    public async Task<ZernioLinkedInOrganizationDto?> UpdateLinkedInOrganizationAsync(
        string accountId,
        string selectedOrganizationUrn,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.UpdateLinkedInOrganizationRequest(
                Zernio.Model.UpdateLinkedInOrganizationRequest.AccountTypeEnum.Organization,
                new { id = selectedOrganizationUrn }
            );

            var response = await _connectApi.UpdateLinkedInOrganizationAsync(accountId, sdkRequest, cancellationToken);
            var account = response?.Account;
            if (account is not null)
            {
                return new ZernioLinkedInOrganizationDto(
                    account.Id ?? string.Empty,
                    account.DisplayName ?? string.Empty,
                    account.Username,
                    account.ProfilePicture);
            }
            return null;
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered switching LinkedIn organization for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to switch LinkedIn organizations.",
                reason: "linkedin_organization_switch_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error switching LinkedIn organization for account {AccountId}", accountId);
            throw new DomainException("zernio_linkedin_organization_switch_error", "Failed to switch LinkedIn organization", ex);
        }
    }

    // ── LinkedIn Organization response models ────────────────────────────────

    private sealed class LinkedInOrganizationsResponse
    {
        public List<LinkedInOrganizationItem>? Organizations { get; set; }
        public string? SelectedOrganizationUrn { get; set; }
        public bool Cached { get; set; }
    }

    private sealed class LinkedInOrganizationItem
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? VanityName { get; set; }
        public string? LogoUrl { get; set; }
    }

    // ── YouTube Playlist methods ─────────────────────────────────────────────

    public async Task<ZernioYouTubePlaylistsResponseDto> GetYouTubePlaylistsAsync(
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _connectApi.GetYoutubePlaylistsAsync(
                accountId,
                cancellationToken);

            var playlists = (response?.Playlists ?? new List<Zernio.Model.GetYoutubePlaylists200ResponsePlaylistsInner>())
                .Select(p => new ZernioYouTubePlaylistDto(
                    p.Id ?? string.Empty,
                    p.Title ?? string.Empty,
                    p.Description,
                    p.Privacy?.ToString(),
                    p.ItemCount,
                    p.ThumbnailUrl))
                .ToList();

            return new ZernioYouTubePlaylistsResponseDto(
                playlists,
                response?.DefaultPlaylistId);
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered listing YouTube playlists for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to manage YouTube playlists.",
                reason: "youtube_playlists_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error listing YouTube playlists for account {AccountId}", accountId);
            throw new DomainException("zernio_youtube_playlists_error", "Failed to list YouTube playlists", ex);
        }
    }

    public async Task<bool> UpdateYouTubeDefaultPlaylistAsync(
        string accountId,
        string defaultPlaylistId,
        string? defaultPlaylistName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new UpdateYoutubeDefaultPlaylistRequest(
                defaultPlaylistId: defaultPlaylistId,
                defaultPlaylistName: defaultPlaylistName);

            var response = await _connectApi.UpdateYoutubeDefaultPlaylistAsync(
                accountId,
                request,
                cancellationToken);

            return response?.Success ?? false;
        }
        catch (ApiException ex) when (ex.ErrorCode == 402)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered switching YouTube playlist for account {AccountId}", accountId);
            throw new ZernioBillingRequiredException(
                "A paid Zernio plan is required to switch YouTube playlists.",
                reason: "youtube_playlist_switch_restricted",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { accountId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error switching YouTube playlist for account {AccountId}", accountId);
            throw new DomainException("zernio_youtube_playlist_switch_error", "Failed to switch YouTube playlist", ex);
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
                    c.Status?.ToString(),
                    c.AccountId,
                    c.UnreadCount))
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
        string accountId,
        string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesApi.GetInboxConversationMessagesAsync(
                conversationId,
                accountId: accountId,
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
                    m.ReadAt != default,
                    m.Attachments?.Select(a => new ZernioMessageAttachmentDto(
                        a.Id ?? string.Empty,
                        a.Type?.ToString()?.ToLowerInvariant() ?? string.Empty,
                        a.Url ?? string.Empty,
                        a.Filename,
                        a.PreviewUrl
                    )).ToList()
                ))
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
        Syncra.Application.DTOs.Inbox.InboxSendMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.SendInboxMessageRequest(request.AccountId)
            {
                Message = request.Text,
                AttachmentUrl = request.AttachmentUrl,
                ReplyTo = request.ReplyTo
            };

            if (request.Text is null && request.AttachmentUrl is null && request.Template is null && request.Interactive is null)
            {
                sdkRequest.Message = string.Empty;
            }

            if (!string.IsNullOrEmpty(request.AttachmentType))
            {
                if (Enum.TryParse<Zernio.Model.SendInboxMessageRequest.AttachmentTypeEnum>(request.AttachmentType, true, out var attType))
                {
                    sdkRequest.AttachmentType = attType;
                }
            }

            if (!string.IsNullOrEmpty(request.MessagingType))
            {
                if (Enum.TryParse<Zernio.Model.SendInboxMessageRequest.MessagingTypeEnum>(request.MessagingType, true, out var msgType))
                {
                    sdkRequest.MessagingType = msgType;
                }
            }

            if (!string.IsNullOrEmpty(request.MessageTag))
            {
                if (Enum.TryParse<Zernio.Model.SendInboxMessageRequest.MessageTagEnum>(request.MessageTag, true, out var msgTag))
                {
                    sdkRequest.MessageTag = msgTag;
                }
            }

            if (request.QuickReplies != null)
            {
                sdkRequest.QuickReplies = request.QuickReplies.Select(qr => new Zernio.Model.SendInboxMessageRequestQuickRepliesInner
                {
                    Title = qr.Title,
                    Payload = qr.Payload,
                    ImageUrl = qr.ImageUrl
                }).ToList();
            }

            if (request.Buttons != null)
            {
                sdkRequest.Buttons = request.Buttons.Select(b =>
                {
                    var btn = new Zernio.Model.SendInboxMessageRequestButtonsInner
                    {
                        Title = b.Title
                    };
                    if (Enum.TryParse<Zernio.Model.SendInboxMessageRequestButtonsInner.TypeEnum>(b.Type, true, out var btnType))
                    {
                        btn.Type = btnType;
                    }
                    if (b.Type.Equals("url", StringComparison.OrdinalIgnoreCase))
                    {
                        btn.Url = b.Url;
                    }
                    else if (b.Type.Equals("postback", StringComparison.OrdinalIgnoreCase))
                    {
                        btn.Payload = b.Payload;
                    }
                    else if (b.Type.Equals("phone", StringComparison.OrdinalIgnoreCase))
                    {
                        btn.Phone = b.Phone;
                    }
                    return btn;
                }).ToList();
            }

            if (request.Template != null)
            {
                var json = JsonSerializer.Serialize(request.Template, _jsonOptions);
                sdkRequest.Template = JsonSerializer.Deserialize<Zernio.Model.SendInboxMessageRequestTemplate>(json, _jsonOptions);
            }

            if (request.Interactive != null)
            {
                var json = JsonSerializer.Serialize(request.Interactive, _jsonOptions);
                sdkRequest.Interactive = JsonSerializer.Deserialize<Zernio.Model.SendInboxMessageRequestInteractive>(json, _jsonOptions);
            }

            if (request.ReplyMarkup != null)
            {
                var json = JsonSerializer.Serialize(request.ReplyMarkup, _jsonOptions);
                sdkRequest.ReplyMarkup = JsonSerializer.Deserialize<Zernio.Model.SendInboxMessageRequestReplyMarkup>(json, _jsonOptions);
            }

            var response = await _messagesApi.SendInboxMessageAsync(
                conversationId,
                sdkRequest,
                cancellationToken);

            var sentAt = (response.Data?.SentAt == null || response.Data.SentAt == default(DateTime))
                ? DateTime.UtcNow
                : response.Data.SentAt;

            return new ZernioSendMessageResponseDto(
                response.Data?.MessageId ?? string.Empty,
                sentAt);
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

    public async Task<InboxConversationDetailsDto> GetInboxConversationAsync(
        string conversationId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesApi.GetInboxConversationAsync(
                conversationId,
                accountId,
                cancellationToken);

            var rawData = response.Data;

            var participants = (rawData.Participants ?? [])
                .Select(p => new InboxParticipantDto(p.Id, p.Name))
                .ToList();

            InboxInstagramProfileDto? instagramProfile = null;
            if (rawData.InstagramProfile != null)
            {
                var ip = rawData.InstagramProfile;
                instagramProfile = new InboxInstagramProfileDto(
                    ip.IsFollower,
                    ip.IsFollowing,
                    ip.FollowerCount,
                    ip.IsVerified,
                    ip.FetchedAt);
            }

            return new InboxConversationDetailsDto(
                rawData.Id,
                rawData.AccountId,
                rawData.AccountUsername,
                rawData.Platform,
                rawData.Status?.ToString() ?? string.Empty,
                rawData.ParticipantName,
                rawData.ParticipantId,
                rawData.ParticipantVerifiedType?.ToString(),
                rawData.LastMessage,
                rawData.LastMessageAt,
                rawData.UpdatedTime,
                participants,
                instagramProfile);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for get conversation, conversation {ConversationId}", conversationId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to access inbox conversations.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error getting conversation {ConversationId}", conversationId);
            throw new DomainException("zernio_inbox_get_error", "Failed to get inbox conversation from Zernio", ex);
        }
    }

    public async Task<InboxCreateConversationResponseDto> CreateInboxConversationAsync(
        Syncra.Application.DTOs.Inbox.CreateInboxConversationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.CreateInboxConversationRequest(request.AccountId)
            {
                ParticipantId = request.ParticipantId,
                ParticipantUsername = request.ParticipantUsername,
                Message = request.Message,
                SkipDmCheck = request.SkipDmCheck ?? false,
                TemplateLanguage = request.TemplateLanguage,
                TemplateName = request.TemplateName
            };

            if (request.TemplateParams != null)
            {
                sdkRequest.TemplateParams = request.TemplateParams;
            }

            var response = await _messagesApi.CreateInboxConversationAsync(sdkRequest, cancellationToken);

            return new InboxCreateConversationResponseDto(
                response.Data?.MessageId ?? string.Empty,
                response.Data?.ConversationId ?? string.Empty,
                response.Data?.ParticipantId ?? string.Empty,
                response.Data?.ParticipantName,
                response.Data?.ParticipantUsername);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for create conversation");
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to create inbox conversations.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: null);
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error creating conversation");
            throw new DomainException("zernio_inbox_create_error", "Failed to create inbox conversation via Zernio", ex);
        }
    }

    public async Task<InboxUpdateConversationResponseDto> UpdateInboxConversationAsync(
        string conversationId,
        Syncra.Application.DTOs.Inbox.UpdateInboxConversationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            Zernio.Model.UpdateInboxConversationRequest.StatusEnum statusEnum = default;
            Enum.TryParse<Zernio.Model.UpdateInboxConversationRequest.StatusEnum>(request.Status, true, out statusEnum);

            var sdkRequest = new Zernio.Model.UpdateInboxConversationRequest(request.AccountId, statusEnum);

            var response = await _messagesApi.UpdateInboxConversationAsync(conversationId, sdkRequest, cancellationToken);

            return new InboxUpdateConversationResponseDto(
                response.Data?.Status?.ToString() ?? string.Empty,
                response.Data?.Id ?? string.Empty,
                response.Data?.AccountId ?? string.Empty,
                response.Data?.Platform ?? string.Empty,
                response.Data?.UpdatedAt ?? DateTime.UtcNow);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for update conversation, conversation {ConversationId}", conversationId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to update inbox conversations.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error updating conversation {ConversationId}", conversationId);
            throw new DomainException("zernio_inbox_update_error", "Failed to update inbox conversation via Zernio", ex);
        }
    }

    public async Task<bool> MarkConversationReadAsync(
        string conversationId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.SendTypingIndicatorRequest(accountId);

            var response = await _messagesApi.MarkConversationReadAsync(conversationId, sdkRequest, cancellationToken);
            return response.Success;
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for mark conversation read, conversation {ConversationId}", conversationId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to mark inbox conversations as read.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId });
        }
        catch (ApiException ex) when (ex.ErrorCode is 429)
        {
            _logger.LogWarning(ex, "Zernio API rate limit exceeded when marking conversation read {ConversationId}", conversationId);
            return false;
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error marking conversation read {ConversationId}", conversationId);
            throw new DomainException("zernio_inbox_read_error", "Failed to mark inbox conversation read via Zernio", ex);
        }
    }

    public async Task<InboxEditMessageResponseDto> EditInboxMessageAsync(
        string conversationId,
        string messageId,
        Syncra.Application.DTOs.Inbox.EditInboxMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.EditInboxMessageRequest(request.AccountId)
            {
                Text = request.Text
            };

            if (request.ReplyMarkup != null)
            {
                var json = JsonSerializer.Serialize(request.ReplyMarkup, _jsonOptions);
                sdkRequest.ReplyMarkup = JsonSerializer.Deserialize<Zernio.Model.EditInboxMessageRequestReplyMarkup>(json, _jsonOptions);
            }

            var response = await _messagesApi.EditInboxMessageAsync(conversationId, messageId, sdkRequest, cancellationToken);

            return new InboxEditMessageResponseDto(response.Data?.MessageId ?? 0);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for edit message, conversation {ConversationId}, message {MessageId}", conversationId, messageId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to edit inbox messages.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId, messageId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error editing message {MessageId} in conversation {ConversationId}", messageId, conversationId);
            throw new DomainException("zernio_inbox_edit_error", "Failed to edit inbox message via Zernio", ex);
        }
    }

    public async Task<bool> DeleteInboxMessageAsync(
        string conversationId,
        string messageId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesApi.DeleteInboxMessageAsync(conversationId, messageId, accountId, cancellationToken);
            return response.Success;
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for delete message, conversation {ConversationId}, message {MessageId}", conversationId, messageId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to delete inbox messages.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId, messageId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error deleting message {MessageId} in conversation {ConversationId}", messageId, conversationId);
            throw new DomainException("zernio_inbox_delete_error", "Failed to delete inbox message via Zernio", ex);
        }
    }

    public async Task<bool> AddMessageReactionAsync(
        string conversationId,
        string messageId,
        Syncra.Application.DTOs.Inbox.AddMessageReactionRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.AddMessageReactionRequest(request.AccountId, request.Emoji);

            var response = await _messagesApi.AddMessageReactionAsync(conversationId, messageId, sdkRequest, cancellationToken);
            return response.Success;
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for add reaction, conversation {ConversationId}, message {MessageId}", conversationId, messageId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to react to inbox messages.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId, messageId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error adding reaction to message {MessageId} in conversation {ConversationId}", messageId, conversationId);
            throw new DomainException("zernio_inbox_reaction_error", "Failed to add message reaction via Zernio", ex);
        }
    }

    public async Task<bool> RemoveMessageReactionAsync(
        string conversationId,
        string messageId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesApi.RemoveMessageReactionAsync(conversationId, messageId, accountId, cancellationToken);
            return response.Success;
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for remove reaction, conversation {ConversationId}, message {MessageId}", conversationId, messageId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to remove reactions from inbox messages.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId, messageId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error removing reaction from message {MessageId} in conversation {ConversationId}", messageId, conversationId);
            throw new DomainException("zernio_inbox_reaction_error", "Failed to remove message reaction via Zernio", ex);
        }
    }

    public async Task<bool> SendTypingIndicatorAsync(
        string conversationId,
        Syncra.Application.DTOs.Inbox.SendTypingIndicatorRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.SendTypingIndicatorRequest(request.AccountId);

            var response = await _messagesApi.SendTypingIndicatorAsync(conversationId, sdkRequest, cancellationToken);
            return response.Success;
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for typing indicator, conversation {ConversationId}", conversationId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to send typing indicators.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { conversationId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error sending typing indicator in conversation {ConversationId}", conversationId);
            throw new DomainException("zernio_inbox_typing_error", "Failed to send typing indicator via Zernio", ex);
        }
    }

    // ── Inbox Comment methods ───────────────────────────────────────────────

    public async Task<ZernioInboxCommentsPageDto> ListInboxCommentsAsync(
        string profileId,
        DateTime? since = null,
        string? cursor = null,
        string? platform = null,
        string? accountId = null,
        int? minComments = null,
        string? sortBy = null,
        string? sortOrder = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _commentsApi.ListInboxCommentsAsync(
                profileId,
                platform: platform,
                minComments: minComments,
                since: since,
                sortBy: sortBy,
                sortOrder: sortOrder,
                limit: limit,
                cursor: cursor,
                accountId: accountId,
                cancellationToken: cancellationToken);

            var items = (response.Data ?? [])
                .Select(c => new ZernioInboxCommentItemDto(
                    c.Id,
                    c.Platform ?? string.Empty,
                    c.Content ?? string.Empty,
                    c.Picture,
                    c.Permalink,
                    c.CreatedTime,
                    c.CommentCount,
                    c.Cid,
                    c.AccountId,
                    c.AccountUsername,
                    c.LikeCount,
                    c.Subreddit,
                    c.IsAd,
                    c.AdId,
                    c.Placement?.ToString()))
                .ToList();

            ZernioInboxCommentMetaDto? metaDto = null;
            if (response.Meta != null)
            {
                var failedAccounts = (response.Meta.FailedAccounts ?? [])
                    .Select(fa => new ZernioInboxFailedAccountDto(
                        fa.AccountId,
                        fa.AccountUsername,
                        fa.Platform ?? string.Empty,
                        fa.Error ?? string.Empty,
                        fa.Code,
                        fa.RetryAfter))
                    .ToList();

                metaDto = new ZernioInboxCommentMetaDto(
                    response.Meta.AccountsQueried,
                    response.Meta.AccountsFailed,
                    failedAccounts,
                    response.Meta.LastUpdated);
            }

            return new ZernioInboxCommentsPageDto(
                items,
                response.Pagination?.HasMore ?? false,
                response.Pagination?.NextCursor,
                metaDto);
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

    public async Task<ZernioReplyResponseDto> ReplyToInboxCommentAsync(
        string profileId,
        string zernioPostId,
        string accountId,
        string message,
        string? commentId = null,
        string? parentCid = null,
        string? rootUri = null,
        string? rootCid = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var targetCommentId = (commentId == zernioPostId || Guid.TryParse(commentId, out _)) ? null : commentId;
            var sdkRequest = new ReplyToInboxPostRequest(
                accountId: accountId,
                message: message,
                commentId: targetCommentId,
                parentCid: parentCid,
                rootUri: rootUri,
                rootCid: rootCid);

            var response = await _commentsApi.ReplyToInboxPostAsync(
                zernioPostId,
                sdkRequest,
                cancellationToken);

            return new ZernioReplyResponseDto(
                response.Data?.CommentId ?? string.Empty,
                response.Data?.Cid,
                response.Data?.IsReply ?? false);
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

    public async Task<ZernioDeleteCommentResponseDto> DeleteInboxCommentAsync(
        string zernioPostId,
        string accountId,
        string commentId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _commentsApi.DeleteInboxCommentAsync(zernioPostId, accountId, commentId, cancellationToken);
            return new ZernioDeleteCommentResponseDto(
                Success: response.Success,
                Message: response.Data?.Message);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for delete comment {CommentId}", commentId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to delete comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { commentId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error deleting comment {CommentId} on post {PostId}", commentId, zernioPostId);
            throw new DomainException("zernio_inbox_delete_error", "Failed to delete comment via Zernio", ex);
        }
    }

    public async Task<ZernioPostCommentsResponseDto> GetInboxPostCommentsAsync(
        string zernioPostId,
        string accountId,
        string? subreddit = null,
        int? limit = null,
        string? cursor = null,
        string? commentId = null,
        string? selfAccountId = null,
        string? platform = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _commentsApi.GetInboxPostCommentsAsync(
                zernioPostId,
                accountId,
                subreddit,
                limit,
                cursor,
                commentId,
                cancellationToken);

            ZernioPostCommentItemDto MapCommentItem(Zernio.Model.GetInboxPostComments200ResponseCommentsInner item)
            {
                IReadOnlyList<ZernioPostCommentItemDto>? repliesMapped = null;
                if (item.Replies != null && item.Replies.Count > 0)
                {
                    var list = new List<ZernioPostCommentItemDto>();
                    foreach (var obj in item.Replies)
                    {
                        if (obj == null) continue;
                        if (obj is Zernio.Model.GetInboxPostComments200ResponseCommentsInner childItem)
                        {
                            list.Add(MapCommentItem(childItem));
                        }
                        else
                        {
                            try
                            {
                                string? jsonStr = null;
                                var typeName = obj.GetType().FullName;
                                if (typeName != null && (typeName.StartsWith("Newtonsoft.Json") || typeName.StartsWith("System.Text.Json")))
                                {
                                    jsonStr = obj.ToString();
                                }
                                else
                                {
                                    jsonStr = JsonSerializer.Serialize(obj, _jsonOptions);
                                }

                                if (!string.IsNullOrEmpty(jsonStr))
                                {
                                    var deserialized = JsonSerializer.Deserialize<Zernio.Model.GetInboxPostComments200ResponseCommentsInner>(jsonStr, _jsonOptions);
                                    if (deserialized != null)
                                    {
                                        list.Add(MapCommentItem(deserialized));
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Failed to deserialize nested reply comment: {Message}", ex.Message);
                            }
                        }
                    }
                    repliesMapped = list;
                }

                var author = item.From != null ? new ZernioCommentAuthorDto(
                    item.From.Id ?? string.Empty,
                    item.From.Name ?? string.Empty,
                    item.From.Username,
                    item.From.Picture,
                    item.From.IsOwner,
                    item.From.VerifiedType?.ToString()
                ) : null;

                return new ZernioPostCommentItemDto(
                    item.Id,
                    item.Message ?? string.Empty,
                    item.CreatedTime,
                    author,
                    item.LikeCount,
                    item.ReplyCount,
                    item.Platform ?? string.Empty,
                    item.Url,
                    item.CanReply,
                    item.CanDelete,
                    item.CanHide,
                    item.CanLike,
                    item.IsHidden,
                    item.IsLiked,
                    item.LikeUri,
                    item.Cid,
                    item.ParentId,
                    RootUri: null,
                    RootCid: null,
                    Replies: repliesMapped,
                    IsAd: null
                );
            }

            var items = (response.Comments ?? [])
                .Select(c => MapCommentItem(c))
                .ToList();

            var metaAdComments = response.Meta?.AdComments != null ? new ZernioCommentsMetaAdCommentsDto(
                response.Meta.AdComments.AdId,
                response.Meta.AdComments.AdCommentsUrl
            ) : null;

            var meta = new ZernioCommentsMetaDto(
                Platform: response.Meta?.Platform ?? string.Empty,
                PostId: response.Meta?.PostId,
                AccountId: response.Meta?.AccountId ?? accountId,
                Subreddit: response.Meta?.Subreddit ?? subreddit,
                LastUpdated: response.Meta?.LastUpdated ?? DateTime.UtcNow,
                AdComments: metaAdComments);

            ZernioPostMetaDto? postDto = null;
            if (response.Post != null)
            {
                postDto = new ZernioPostMetaDto(
                    response.Post.Id ?? string.Empty,
                    response.Post.Fullname,
                    response.Post.Title,
                    response.Post.Selftext,
                    response.Post.Author,
                    response.Post.Subreddit,
                    response.Post.Permalink,
                    response.Post.Url,
                    response.Post.Score,
                    response.Post.NumComments,
                    response.Post.CreatedUtc,
                    response.Post.Over18,
                    response.Post.Stickied,
                    response.Post.FlairText,
                    response.Post.IsGallery
                );
            }

            var pagination = new ZernioCommentsPaginationDto(
                response.Pagination?.HasMore ?? false,
                response.Pagination?.Cursor
            );

            return new ZernioPostCommentsResponseDto(
                Status: "ok",
                Post: postDto,
                Meta: meta,
                Comments: items,
                Pagination: pagination);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for get comments of post {PostId}", zernioPostId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to fetch post comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { zernioPostId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error getting comments for post {PostId}", zernioPostId);
            throw new DomainException("zernio_inbox_get_comments_error", "Failed to get post comments via Zernio", ex);
        }
    }

    public async Task<ZernioCommentActionResponseDto> HideInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new Zernio.Model.HideInboxCommentRequest(accountId);
            var response = await _commentsApi.HideInboxCommentAsync(zernioPostId, commentId, request, cancellationToken);
            return new ZernioCommentActionResponseDto(
                Status: response.Status,
                CommentId: response.CommentId,
                Platform: response.Platform);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for hide comment {CommentId}", commentId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to hide comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { commentId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error hiding comment {CommentId} on post {PostId}", commentId, zernioPostId);
            throw new DomainException("zernio_inbox_hide_error", "Failed to hide comment via Zernio", ex);
        }
    }

    public async Task<ZernioCommentActionResponseDto> UnhideInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _commentsApi.UnhideInboxCommentAsync(zernioPostId, commentId, accountId, cancellationToken);
            return new ZernioCommentActionResponseDto(
                Status: response.Status,
                CommentId: response.CommentId,
                Platform: response.Platform);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for unhide comment {CommentId}", commentId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to unhide comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { commentId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error unhiding comment {CommentId} on post {PostId}", commentId, zernioPostId);
            throw new DomainException("zernio_inbox_unhide_error", "Failed to unhide comment via Zernio", ex);
        }
    }

    public async Task<ZernioLikeActionResponseDto> LikeInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        string? cid = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new Zernio.Model.LikeInboxCommentRequest(accountId);
            if (!string.IsNullOrEmpty(cid)) request.Cid = cid;

            var response = await _commentsApi.LikeInboxCommentAsync(zernioPostId, commentId, request, cancellationToken);
            return new ZernioLikeActionResponseDto(
                Liked: response.Liked,
                Status: response.Status,
                CommentId: response.CommentId,
                Platform: response.Platform,
                LikeUri: response.LikeUri);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for like comment {CommentId}", commentId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to like comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { commentId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error liking comment {CommentId} on post {PostId}", commentId, zernioPostId);
            throw new DomainException("zernio_inbox_like_error", "Failed to like comment via Zernio", ex);
        }
    }

    public async Task<ZernioLikeActionResponseDto> UnlikeInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        string? likeUri = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _commentsApi.UnlikeInboxCommentAsync(zernioPostId, commentId, accountId, likeUri, cancellationToken);
            return new ZernioLikeActionResponseDto(
                Liked: response.Liked == false,
                Status: response.Status,
                CommentId: response.CommentId,
                Platform: response.Platform);
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for unlike comment {CommentId}", commentId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to unlike comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { commentId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error unliking comment {CommentId} on post {PostId}", commentId, zernioPostId);
            throw new DomainException("zernio_inbox_unlike_error", "Failed to unlike comment via Zernio", ex);
        }
    }

    public async Task<ZernioCommentActionResponseDto> SendPrivateReplyToCommentAsync(
        string zernioPostId,
        string commentId,
        ZernioPrivateReplyRequestDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sdkRequest = new Zernio.Model.SendPrivateReplyToCommentRequest(request.AccountId, request.Message);
            if (request.QuickReplies is { Count: > 0 })
            {
                sdkRequest.QuickReplies = request.QuickReplies
                    .Select(qr => new Zernio.Model.SendPrivateReplyToCommentRequestQuickRepliesInner(
                        qr.Title,
                        qr.Payload,
                        qr.ImageUrl))
                    .ToList();
            }
            if (request.Buttons is { Count: > 0 })
            {
                sdkRequest.Buttons = request.Buttons
                    .Select(b => BuildSdkButton(b))
                    .ToList();
            }

            var response = await _commentsApi.SendPrivateReplyToCommentAsync(zernioPostId, commentId, sdkRequest, cancellationToken);
            return new ZernioCommentActionResponseDto(
                Status: response.Status,
                CommentId: response.CommentId,
                MessageId: response.MessageId,
                Platform: response.Platform?.ToString());
        }
        catch (ApiException ex) when (ex.ErrorCode is 402 or 403)
        {
            _logger.LogWarning(ex, "Zernio inbox billing gate for private reply to comment {CommentId}", commentId);
            throw new ZernioBillingRequiredException(
                "Inbox add-on is required to send private replies.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { commentId });
        }
        catch (ApiException ex)
        {
            _logger.LogError(ex, "Zernio API error sending private reply to comment {CommentId} on post {PostId}", commentId, zernioPostId);

            if (ex.Message != null && ex.Message.Contains("older than 7 days"))
            {
                throw new DomainException("private_reply_expired", "Private reply can only be sent within 7 days of the comment.", ex);
            }

            throw new DomainException("zernio_inbox_private_reply_error", "Failed to send private reply via Zernio", ex);
        }
    }

    private static Zernio.Model.SendPrivateReplyToCommentRequestButtonsInner BuildSdkButton(
        ZernioPrivateReplyButtonDto b)
    {
        var type = b.Type?.Trim().ToLowerInvariant();
        return type switch
        {
            "postback" => new Zernio.Model.SendPrivateReplyToCommentRequestButtonsInner(
                new Zernio.Model.SendPrivateReplyToCommentRequestButtonsInnerOneOf1(
                    Zernio.Model.SendPrivateReplyToCommentRequestButtonsInnerOneOf1.TypeEnum.Postback,
                    b.Title,
                    b.Payload ?? string.Empty)),
            "phone" => new Zernio.Model.SendPrivateReplyToCommentRequestButtonsInner(
                new Zernio.Model.SendPrivateReplyToCommentRequestButtonsInnerOneOf2(
                    Zernio.Model.SendPrivateReplyToCommentRequestButtonsInnerOneOf2.TypeEnum.Phone,
                    b.Title,
                    b.PhoneNumber ?? string.Empty)),
            _ => new Zernio.Model.SendPrivateReplyToCommentRequestButtonsInner(
                new Zernio.Model.SendPrivateReplyToCommentRequestButtonsInnerOneOf(
                    Zernio.Model.SendPrivateReplyToCommentRequestButtonsInnerOneOf.TypeEnum.Url,
                    b.Title,
                    b.Url ?? string.Empty)),
        };
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
            var queryParams = new List<string> { $"profileId={Uri.EscapeDataString(profileId)}" };
            if (!string.IsNullOrEmpty(platform))
                queryParams.Add($"platform={Uri.EscapeDataString(platform)}");
            if (!string.IsNullOrEmpty(cursor))
                queryParams.Add($"cursor={Uri.EscapeDataString(cursor)}");
            if (!string.IsNullOrEmpty(accountId))
                queryParams.Add($"accountId={Uri.EscapeDataString(accountId)}");

            var url = $"https://zernio.com/api/v1/inbox/reviews?{string.Join("&", queryParams)}";

            using var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

            using var responseMessage = await client.SendAsync(request, cancellationToken);

            if (responseMessage.StatusCode == System.Net.HttpStatusCode.PaymentRequired ||
                responseMessage.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Zernio inbox billing gate for list reviews, profile {ProfileId}", profileId);
                throw new ZernioBillingRequiredException(
                    "Inbox add-on is required to access reviews.",
                    reason: "inbox_addon_required",
                    dashboardUrl: "https://zernio.com/dashboard/billing",
                    details: new { profileId });
            }

            if (!responseMessage.IsSuccessStatusCode)
            {
                var errorContent = await responseMessage.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Zernio API error listing inbox reviews for profile {ProfileId}. Status: {Status}, Content: {Content}",
                    profileId, responseMessage.StatusCode, errorContent);
                throw new DomainException("zernio_inbox_reviews_error", "Failed to list inbox reviews from Zernio");
            }

            var json = await responseMessage.Content.ReadAsStringAsync(cancellationToken);
            var reviewResponse = JsonSerializer.Deserialize<DirectReviewResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var items = (reviewResponse?.Data ?? [])
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
                reviewResponse?.Pagination?.HasMore ?? false,
                reviewResponse?.Pagination?.NextCursor);
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
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

    private record DirectFollowerStatsResponse(
        List<DirectFollowerStatsAccount>? Accounts,
        Dictionary<string, List<DirectFollowerStatsDataPoint>>? Stats,
        DirectFollowerStatsDateRange? DateRange,
        string? Granularity);

    private record DirectFollowerStatsAccount(
        [property: System.Text.Json.Serialization.JsonPropertyName("_id")] string? Id,
        string? AccountId,
        string? Platform,
        string? Username,
        string? DisplayName,
        string? ProfilePicture,
        int CurrentFollowers,
        DateTime LastUpdated,
        int Growth,
        float GrowthPercentage,
        int DataPoints);

    private record DirectFollowerStatsDataPoint(
        DateOnly Date,
        int Followers);

    private record DirectFollowerStatsDateRange(
        DateTime From,
        DateTime To);

    public async Task<ZernioFollowerStatsResponseDto> GetFollowerStatsAsync(
        string? accountIds = null,
        string? profileId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? granularity = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var queryParams = new List<string>();
            if (!string.IsNullOrEmpty(accountIds))
                queryParams.Add($"accountIds={Uri.EscapeDataString(accountIds)}");
            if (!string.IsNullOrEmpty(profileId))
                queryParams.Add($"profileId={Uri.EscapeDataString(profileId)}");
            if (fromDate.HasValue)
                queryParams.Add($"fromDate={fromDate.Value:yyyy-MM-dd}");
            if (toDate.HasValue)
                queryParams.Add($"toDate={toDate.Value:yyyy-MM-dd}");
            if (!string.IsNullOrEmpty(granularity))
                queryParams.Add($"granularity={Uri.EscapeDataString(granularity)}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            var url = $"https://zernio.com/api/v1/accounts/follower-stats{queryString}";

            using var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

            using var responseMessage = await client.SendAsync(request, cancellationToken);

            if (responseMessage.StatusCode == System.Net.HttpStatusCode.PaymentRequired ||
                responseMessage.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Zernio billing gate triggered for follower stats, profile {ProfileId}", profileId);
                throw new ZernioBillingRequiredException(
                    "Analytics add-on is required to access follower stats.",
                    reason: "analytics_addon_required",
                    dashboardUrl: "https://zernio.com/dashboard/billing",
                    details: new { profileId });
            }

            if (!responseMessage.IsSuccessStatusCode)
            {
                var errorContent = await responseMessage.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Zernio API error fetching follower stats for profile {ProfileId}. Status: {Status}, Content: {Content}",
                    profileId, responseMessage.StatusCode, errorContent);
                throw new DomainException("zernio_follower_stats_error", "Failed to fetch follower stats from Zernio");
            }

            var json = await responseMessage.Content.ReadAsStringAsync(cancellationToken);
            var response = JsonSerializer.Deserialize<DirectFollowerStatsResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (response == null)
            {
                throw new DomainException("zernio_follower_stats_error", "Failed to deserialize follower stats from Zernio");
            }

            var accounts = (response.Accounts ?? [])
                .Select(a => new ZernioFollowerStatsAccountDto(
                    a.Id ?? a.AccountId ?? string.Empty,
                    a.Platform ?? string.Empty,
                    a.Username,
                    a.DisplayName,
                    a.ProfilePicture,
                    a.CurrentFollowers,
                    a.LastUpdated,
                    a.Growth,
                    a.GrowthPercentage,
                    a.DataPoints))
                .ToList();

            var stats = response.Stats?
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => (IReadOnlyList<ZernioFollowerStatsDataPointDto>)kvp.Value
                        .Select(d => new ZernioFollowerStatsDataPointDto(d.Date, d.Followers))
                        .ToList());

            var dateRange = response.DateRange != null
                ? new ZernioFollowerStatsDateRangeDto(response.DateRange.From, response.DateRange.To)
                : null;

            return new ZernioFollowerStatsResponseDto(
                accounts,
                stats,
                dateRange,
                response.Granularity);
        }
        catch (ZernioBillingRequiredException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException && ex is not DomainException)
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

    public async Task<ZernioFacebookConnectPagesResponseDto> GetFacebookConnectPagesAsync(
        string profileId,
        string tempToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _connectApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');
            var url = $"{baseUrl}/v1/connect/facebook/select-page?profileId={Uri.EscapeDataString(profileId)}&tempToken={Uri.EscapeDataString(tempToken)}";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorResponse = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to get Facebook connect pages. Status: {StatusCode}, Error: {Error}",
                    httpResponse.StatusCode, errorResponse);
                throw new DomainException("zernio_facebook_connect_pages_error", $"Zernio get Facebook pages failed. Error: {errorResponse}");
            }

            var responseContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<ZernioFacebookConnectPagesResponseDto>(responseContent, _jsonOptions);

            if (result == null)
            {
                throw new DomainException("zernio_facebook_connect_pages_error", "Zernio returned an empty response for Facebook connect pages.");
            }

            return result;
        }
        catch (Exception ex) when (ex is not DomainException)
        {
            _logger.LogError(ex, "Zernio API error getting Facebook connect pages for profile {ProfileId}", profileId);
            throw new DomainException("zernio_facebook_connect_pages_error", "Failed to get Facebook connect pages from Zernio", ex);
        }
    }

    public async Task<ZernioFacebookConnectSelectResponse> SelectFacebookConnectPageAsync(
        ZernioFacebookConnectSelectRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _connectApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');
            var url = $"{baseUrl}/v1/connect/facebook/select-page";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(request, _jsonOptions),
                    System.Text.Encoding.UTF8,
                    "application/json")
            };
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorResponse = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to select Facebook connect page. Status: {StatusCode}, Error: {Error}",
                    httpResponse.StatusCode, errorResponse);
                throw new DomainException("zernio_facebook_connect_select_error", $"Zernio select Facebook page failed. Error: {errorResponse}");
            }

            var responseContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<ZernioFacebookConnectSelectResponse>(responseContent, _jsonOptions);

            if (result == null)
            {
                throw new DomainException("zernio_facebook_connect_select_error", "Zernio returned an empty response for Facebook connect selection.");
            }

            return result;
        }
        catch (Exception ex) when (ex is not DomainException)
        {
            _logger.LogError(ex, "Zernio API error selecting Facebook connect page for profile {ProfileId}", request.ProfileId);
            throw new DomainException("zernio_facebook_connect_select_error", "Failed to select Facebook connect page in Zernio", ex);
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
        string profileId, string tempToken, string? userProfileJson, CancellationToken cancellationToken)
    {
        _logger.LogInformation("ListLinkedInOrganizationsAsync: profileId={ProfileId}, tempToken={TempToken}", profileId, tempToken);
        Zernio.Model.GetPendingOAuthData200Response pendingData = null;
        var now = DateTime.UtcNow;

        // Clean up expired cache items
        foreach (var key in _pendingDataCache.Keys)
        {
            if (_pendingDataCache.TryGetValue(key, out var val) && val.Expiry < now)
            {
                _pendingDataCache.TryRemove(key, out _);
            }
        }

        try
        {
            if (_pendingDataCache.TryGetValue(tempToken, out var cached) && cached.Expiry >= now)
            {
                pendingData = cached.Data;
            }
            else
            {
                pendingData = await _connectApi.GetPendingOAuthDataAsync(tempToken, cancellationToken);
                _pendingDataCache[tempToken] = (now.AddSeconds(15), pendingData);
            }
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(ex, "Failed to get pending OAuth data for LinkedIn. Checking if personal account.");
        }

        if (pendingData != null)
        {
            var orgs = pendingData.Organizations ?? new();
            if (orgs.Count == 0)
            {
                return Array.Empty<ZernioSelectOptionDto>();
            }

            var orgNames = orgs.ToDictionary(o => o.Id, o => o.Name ?? o.VanityName ?? o.Id);
            var orgIds = string.Join(",", orgs.Select(o => o.Id));

            var response = await _connectApi.ListLinkedInOrganizationsAsync(tempToken, orgIds: orgIds, cancellationToken);
            return (response.Organizations ?? [])
                .Select(o => new ZernioSelectOptionDto(
                    o.Id,
                    orgNames.TryGetValue(o.Id, out var displayName) ? displayName : (o.VanityName ?? o.Id),
                    o.LogoUrl))
                .ToList();
        }

        // Check if we have userProfileJson from frontend redirect URL query param
        if (!string.IsNullOrWhiteSpace(userProfileJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(userProfileJson);
                var root = doc.RootElement;
                string? id = null;
                string? displayName = null;
                string? profilePicture = null;

                if (root.TryGetProperty("id", out var idProp)) id = idProp.GetString();
                if (root.TryGetProperty("displayName", out var nameProp)) displayName = nameProp.GetString();
                if (displayName == null && root.TryGetProperty("username", out var userProp)) displayName = userProp.GetString();
                if (root.TryGetProperty("profilePicture", out var picProp)) profilePicture = picProp.GetString();

                if (!string.IsNullOrEmpty(id))
                {
                    return new List<ZernioSelectOptionDto>
                    {
                        new ZernioSelectOptionDto(
                            Id: "personal",
                            Name: (displayName ?? "LinkedIn Personal Account") + " (Personal)",
                            AvatarUrl: profilePicture)
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse userProfileJson: {Json}", userProfileJson);
            }
        }

        return new List<ZernioSelectOptionDto>
        {
            new ZernioSelectOptionDto("personal", "LinkedIn Personal Profile (Default)")
        };
    }

    private async Task<IReadOnlyList<ZernioSelectOptionDto>> ListGoogleBusinessLocationsAsync(
        string profileId, string tempToken, CancellationToken cancellationToken)
    {
        var response = await _connectApi.ListGoogleBusinessLocationsAsync(profileId, null, tempToken, null, null, cancellationToken);
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
        string profileId, string tempToken, string pageId, string? pageName, CancellationToken cancellationToken)
    {
        var request = new SelectFacebookPageRequest(
            profileId: profileId,
            pageId: pageId,
            tempToken: tempToken,
            userProfile: new SelectFacebookPageRequestUserProfile(
                id: pageId,
                name: pageName ?? pageId,
                profilePicture: ""
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
        string profileId, string tempToken, string organizationId, object? userProfile, CancellationToken cancellationToken)
    {
        SelectLinkedInOrganizationRequest request;
        var profileObj = userProfile ?? new { };

        if (organizationId == "personal")
        {
            request = new SelectLinkedInOrganizationRequest(
                profileId: profileId,
                tempToken: tempToken,
                userProfile: profileObj,
                accountType: SelectLinkedInOrganizationRequest.AccountTypeEnum.Personal
            );
        }
        else
        {
            request = new SelectLinkedInOrganizationRequest(
                profileId: profileId,
                tempToken: tempToken,
                userProfile: profileObj,
                accountType: SelectLinkedInOrganizationRequest.AccountTypeEnum.Organization,
                selectedOrganization: new { id = organizationId }
            );
        }

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

    private static GetMediaPresignedUrlRequest.ContentTypeEnum MapMimeTypeToContentTypeEnum(string mimeType)
    {
        return mimeType.ToLowerInvariant() switch
        {
            "image/jpeg" => GetMediaPresignedUrlRequest.ContentTypeEnum.ImageJpeg,
            "image/jpg" => GetMediaPresignedUrlRequest.ContentTypeEnum.ImageJpg,
            "image/png" => GetMediaPresignedUrlRequest.ContentTypeEnum.ImagePng,
            "image/webp" => GetMediaPresignedUrlRequest.ContentTypeEnum.ImageWebp,
            "image/gif" => GetMediaPresignedUrlRequest.ContentTypeEnum.ImageGif,
            "video/mp4" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoMp4,
            "video/mpeg" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoMpeg,
            "video/quicktime" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoQuicktime,
            "video/avi" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoAvi,
            "video/x-msvideo" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoXMsvideo,
            "video/webm" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoWebm,
            "video/x-m4v" => GetMediaPresignedUrlRequest.ContentTypeEnum.VideoXM4v,
            "application/pdf" => GetMediaPresignedUrlRequest.ContentTypeEnum.ApplicationPdf,
            _ => throw new DomainException("unsupported_mime_type", $"MIME type '{mimeType}' is not supported by Zernio.")
        };
    }

    // ── Inbox Analytics methods ───────────────────────────────────────────

    public async Task<ZernioInboxVolumeResponseDto> GetInboxVolumeAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["profileId"] = profileId,
                ["platform"] = platform,
                ["accountId"] = accountId,
                ["source"] = source
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/inbox/volume?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxVolume>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxVolumeResponseDto(true, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                    new ZernioInboxVolumeSummaryDto(0, 0, 0, 0, 0), [], []);

            return new ZernioInboxVolumeResponseDto(
                raw.Success ?? true,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                new ZernioInboxVolumeSummaryDto(
                    Received: raw.Summary?.Received ?? 0,
                    Sent: raw.Summary?.Sent ?? 0,
                    Read: raw.Summary?.Read ?? 0,
                    Failed: raw.Summary?.Failed ?? 0,
                    UniqueConversations: raw.Summary?.UniqueConversations ?? 0),
                (raw.Timeseries ?? []).Select(t => new ZernioInboxDailyTotalsDto(t.Date ?? string.Empty, t.Sent ?? 0, t.Received ?? 0, t.Read ?? 0, t.Failed ?? 0)).ToList(),
                (raw.ByPlatform ?? []).Select(p => new ZernioInboxPlatformBreakdownDto(p.Platform ?? string.Empty, p.Sent ?? 0, p.Received ?? 0, p.Read ?? 0, p.Failed ?? 0)).ToList());
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox volume");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/volume" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox volume preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox volume preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching inbox volume");
            throw new DomainException("zernio_inbox_volume_error", "Failed to fetch inbox volume from Zernio", ex);
        }
    }

    public async Task<ZernioInboxTopAccountsResponseDto> GetInboxTopAccountsAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? source = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["profileId"] = profileId,
                ["platform"] = platform,
                ["source"] = source,
                ["limit"] = limit?.ToString()
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/inbox/top-accounts?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxTopAccounts>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxTopAccountsResponseDto(true, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"), []);

            return new ZernioInboxTopAccountsResponseDto(
                raw.Success ?? true,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                (raw.Accounts ?? []).Select(a => new ZernioInboxTopAccountDto(
                    AccountId: a.AccountId ?? string.Empty,
                    Platform: a.Platform ?? string.Empty,
                    DisplayName: a.DisplayName ?? string.Empty,
                    Username: a.Username ?? string.Empty,
                    Received: a.Received ?? 0,
                    Sent: a.Sent ?? 0,
                    Total: a.Total ?? 0,
                    Conversations: a.Conversations ?? 0,
                    MedianResponseSeconds: a.MedianResponseSeconds ?? 0,
                    RepliedCount: a.RepliedCount ?? 0)).ToList());
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox top-accounts");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox top accounts.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/top-accounts" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox top-accounts preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox top-accounts preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching inbox top-accounts");
            throw new DomainException("zernio_inbox_top_accounts_error", "Failed to fetch inbox top accounts from Zernio", ex);
        }
    }

    public async Task<ZernioInboxSourceBreakdownResponseDto> GetInboxSourceBreakdownAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["profileId"] = profileId,
                ["platform"] = platform,
                ["accountId"] = accountId
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/inbox/source-breakdown?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxSourceBreakdown>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxSourceBreakdownResponseDto(true, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"), []);

            return new ZernioInboxSourceBreakdownResponseDto(
                raw.Success ?? true,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                (raw.Sources ?? []).Select(s => new ZernioInboxSourceBreakdownRowDto(
                    Source: s.Source ?? string.Empty,
                    Received: s.Received ?? 0,
                    Sent: s.Sent ?? 0,
                    Read: s.Read ?? 0,
                    ByPlatform: (s.ByPlatform ?? []).Select(bp => new ZernioInboxSourcePlatformDto(
                        Platform: bp.Platform ?? string.Empty,
                        Received: bp.Received ?? 0,
                        Sent: bp.Sent ?? 0,
                        Read: bp.Read ?? 0)).ToList())).ToList());
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox source-breakdown");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox source breakdown.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/source-breakdown" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox source-breakdown preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox source-breakdown preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching inbox source-breakdown");
            throw new DomainException("zernio_inbox_source_breakdown_error", "Failed to fetch inbox source breakdown from Zernio", ex);
        }
    }

    public async Task<ZernioInboxResponseTimeResponseDto> GetInboxResponseTimeAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["profileId"] = profileId,
                ["platform"] = platform,
                ["accountId"] = accountId
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/inbox/response-time?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxResponseTime>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxResponseTimeResponseDto(true, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                    new ZernioInboxResponseTimeSummaryDto(0, 0, 0, 0, 0, 0, 0), []);

            return new ZernioInboxResponseTimeResponseDto(
                raw.Success ?? true,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                new ZernioInboxResponseTimeSummaryDto(
                    SampleSize: raw.Summary?.SampleSize ?? 0,
                    MedianSeconds: raw.Summary?.MedianSeconds ?? 0,
                    P90Seconds: raw.Summary?.P90Seconds ?? 0,
                    P99Seconds: raw.Summary?.P99Seconds ?? 0,
                    MeanSeconds: raw.Summary?.MeanSeconds ?? 0,
                    FastestSeconds: raw.Summary?.FastestSeconds ?? 0,
                    SlowestSeconds: raw.Summary?.SlowestSeconds ?? 0),
                (raw.Histogram ?? []).Select(h => new ZernioInboxResponseHistogramBucketDto(
                    Bucket: h.Bucket ?? string.Empty,
                    LowerSeconds: h.LowerSeconds ?? 0,
                    UpperSeconds: h.UpperSeconds ?? 0,
                    Count: h.Count ?? 0)).ToList());
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox response-time");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox response time.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/response-time" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox response-time preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox response-time preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching inbox response-time");
            throw new DomainException("zernio_inbox_response_time_error", "Failed to fetch inbox response time from Zernio", ex);
        }
    }

    public async Task<ZernioInboxHeatmapResponseDto> GetInboxHeatmapAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        string? action = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
                ["profileId"] = profileId,
                ["platform"] = platform,
                ["accountId"] = accountId,
                ["source"] = source,
                ["action"] = action
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/inbox/heatmap?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxHeatmap>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxHeatmapResponseDto(true, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"), []);

            return new ZernioInboxHeatmapResponseDto(
                raw.Success ?? true,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                (raw.Buckets ?? []).Select(b => new ZernioInboxHeatmapBucketDto(
                    Dow: b.Dow ?? 0,
                    Hour: b.Hour ?? 0,
                    Received: b.Received ?? 0,
                    Sent: b.Sent ?? 0,
                    Read: b.Read ?? 0)).ToList());
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox heatmap");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox heatmap.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/heatmap" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox heatmap preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox heatmap preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching inbox heatmap");
            throw new DomainException("zernio_inbox_heatmap_error", "Failed to fetch inbox heatmap from Zernio", ex);
        }
    }

    public async Task<ZernioInboxConversationsListResponseDto> ListInboxConversationsAnalyticsAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        int? limit = null,
        int? page = null,
        string? sortBy = null,
        string? order = null,
        CancellationToken cancellationToken = default)
    {
        var config = _analyticsApi.Configuration;
        var baseUrl = config.BasePath.TrimEnd('/');

        var queryParams = new Dictionary<string, string?>
        {
            ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
            ["toDate"] = toDate?.ToString("yyyy-MM-dd"),
            ["profileId"] = profileId,
            ["platform"] = platform,
            ["accountId"] = accountId,
            ["source"] = source,
            ["limit"] = limit?.ToString(),
            ["page"] = page?.ToString(),
            ["sortBy"] = sortBy,
            ["order"] = order
        };

        var query = string.Join("&",
            queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

        var requestUrl = $"{baseUrl}/v1/analytics/inbox/conversations?{query}";
        _logger.LogInformation("Zernio request: {Url}", requestUrl);

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorBody = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Zernio API {StatusCode} for inbox conversations. URL: {Url}. Body: {Body}",
                    (int)httpResponse.StatusCode, requestUrl, errorBody);
            }

            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxConversationsList>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxConversationsListResponseDto(true, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"), [],
                    new ZernioInboxPaginationDto(1, limit ?? 50, 0, 0, false));

            return new ZernioInboxConversationsListResponseDto(
                raw.Success ?? true,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                (raw.Items ?? []).Select(i => new ZernioInboxConversationListItemDto(
                    ConversationId: i.ConversationId ?? string.Empty,
                    Mongoid: i.Mongoid,
                    AccountId: i.AccountId ?? string.Empty,
                    Platform: i.Platform ?? string.Empty,
                    ParticipantName: i.ParticipantName,
                    ParticipantUsername: i.ParticipantUsername,
                    ParticipantPicture: i.ParticipantPicture,
                    LastMessage: i.LastMessage,
                    TotalMessages: i.TotalMessages ?? 0,
                    Received: i.Received ?? 0,
                    Sent: i.Sent ?? 0,
                    Read: i.Read ?? 0,
                    Failed: i.Failed ?? 0,
                    FirstMessageAt: i.FirstMessageAt ?? DateTime.MinValue,
                    LastMessageAt: i.LastMessageAt ?? DateTime.MinValue)).ToList(),
                new ZernioInboxPaginationDto(
                    Page: raw.Pagination?.Page ?? 1,
                    Limit: raw.Pagination?.Limit ?? 50,
                    Total: raw.Pagination?.Total ?? 0,
                    TotalPages: raw.Pagination?.TotalPages ?? 0,
                    HasMore: raw.Pagination?.HasMore ?? false));
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox conversations list");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox conversations.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/conversations" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox conversations list preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox conversations preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode >= 400 && (int?)ex.StatusCode < 500)
        {
            throw new DomainException("zernio_inbox_conversations_list_error",
                $"Zernio returned {(int?)ex.StatusCode} for inbox conversations.", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error listing inbox conversations. URL: {Url}", requestUrl);
            throw new DomainException("zernio_inbox_conversations_list_error", "Failed to list inbox conversations from Zernio", ex);
        }
    }

    public async Task<ZernioInboxConversationDetailDto> GetInboxConversationAnalyticsAsync(
        string conversationId,
        DateTime fromDate,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = _analyticsApi.Configuration;
            var baseUrl = config.BasePath.TrimEnd('/');

            var queryParams = new Dictionary<string, string?>
            {
                ["fromDate"] = fromDate.ToString("yyyy-MM-dd"),
                ["toDate"] = toDate?.ToString("yyyy-MM-dd")
            };

            var query = string.Join("&",
                queryParams.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                    .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

            var encodedId = Uri.EscapeDataString(conversationId);
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/analytics/inbox/conversations/{encodedId}?{query}");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);

            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var httpResponse = await httpClient.SendAsync(request, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            var raw = System.Text.Json.JsonSerializer.Deserialize<ZernioRawInboxConversationDetail>(json, _jsonOptions);

            if (raw is null)
                return new ZernioInboxConversationDetailDto(true, conversationId, null, string.Empty, fromDate.ToString("yyyy-MM-dd"), (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                    new ZernioInboxConversationSummaryDto(0, 0, 0, 0, 0, DateTime.MinValue, DateTime.MinValue), [], []);

            return new ZernioInboxConversationDetailDto(
                raw.Success ?? true,
                raw.ConversationId ?? conversationId,
                raw.Mongoid,
                raw.Platform ?? string.Empty,
                raw.From ?? fromDate.ToString("yyyy-MM-dd"),
                raw.To ?? (toDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd"),
                new ZernioInboxConversationSummaryDto(
                    Received: raw.Summary?.Received ?? 0,
                    Sent: raw.Summary?.Sent ?? 0,
                    Read: raw.Summary?.Read ?? 0,
                    Failed: raw.Summary?.Failed ?? 0,
                    TotalMessages: raw.Summary?.TotalMessages ?? 0,
                    FirstMessageAt: raw.Summary?.FirstMessageAt ?? DateTime.MinValue,
                    LastMessageAt: raw.Summary?.LastMessageAt ?? DateTime.MinValue),
                (raw.Timeseries ?? []).Select(t => new ZernioInboxDailyTotalsDto(t.Date ?? string.Empty, t.Sent ?? 0, t.Received ?? 0, t.Read ?? 0, t.Failed ?? 0)).ToList(),
                (raw.BySource ?? []).Select(s => new ZernioInboxBySourceRowDto(Source: s.Source ?? string.Empty, Count: s.Count ?? 0)).ToList());
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
        {
            _logger.LogWarning(ex, "Zernio billing gate triggered for inbox conversation analytics");
            throw new ZernioBillingRequiredException(
                "Analytics add-on is required to access inbox conversation analytics.",
                reason: "analytics_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: new { endpoint = "inbox/conversations/{id}" });
        }
        catch (HttpRequestException ex) when ((int?)ex.StatusCode == 412)
        {
            _logger.LogWarning(ex, "Zernio inbox conversation analytics preconditions failed");
            throw new ZernioAnalyticsScopeException("inbox", "Zernio inbox conversation analytics preconditions failed.", "https://zernio.com/dashboard/billing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Zernio API error fetching inbox conversation analytics");
            throw new DomainException("zernio_inbox_conversation_analytics_error", "Failed to fetch inbox conversation analytics from Zernio", ex);
        }
    }

    private sealed class ZernioRawPostListResponse
    {
        public List<ZernioRawPost>? Posts { get; set; }
        public ZernioRawPagination? Pagination { get; set; }
    }

    private sealed class ZernioRawCreatePostResponse
    {
        public string? Message { get; set; }
        public ZernioRawPost? Post { get; set; }
    }

    private sealed class ZernioRawPost
    {
        public string? _Id { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Status { get; set; }
        public DateTime? ScheduledFor { get; set; }
        public string? Timezone { get; set; }
        public List<ZernioRawPlatformTarget>? Platforms { get; set; }
        public List<ZernioRawMediaItem>? MediaItems { get; set; }
        public List<string>? Tags { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    private sealed class ZernioRawPlatformTarget
    {
        public string? Platform { get; set; }
        public ZernioRawAccountId? AccountId { get; set; }
        public string? Status { get; set; }
        public string? PlatformPostId { get; set; }
        public string? PlatformPostUrl { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public System.Text.Json.Nodes.JsonNode? PlatformSpecificData { get; set; }
    }

    private sealed class ZernioRawMediaItem
    {
        public string? _Id { get; set; }
        public string? Type { get; set; }
        public string? Url { get; set; }
        public string? Filename { get; set; }
        public int? Size { get; set; }
        public string? MimeType { get; set; }
    }

    private sealed class ZernioRawAccountId
    {
        public string? _Id { get; set; }
    }

    private sealed class ZernioRawPagination
    {
        public int Page { get; set; }
        public int Limit { get; set; }
        public int Total { get; set; }
        public int Pages { get; set; }
    }

    private sealed class DirectReviewResponse
    {
        public List<DirectReviewItem>? Data { get; set; }
        public DirectReviewPagination? Pagination { get; set; }
    }

    private sealed class DirectReviewItem
    {
        public string Id { get; set; } = string.Empty;
        public string? Platform { get; set; }
        public string? AccountId { get; set; }
        public string? AccountUsername { get; set; }
        public DirectReviewer? Reviewer { get; set; }
        public int Rating { get; set; }
        public string Text { get; set; } = string.Empty;
        public DateTime Created { get; set; }
        public bool HasReply { get; set; }
        public DirectReviewReply? Reply { get; set; }
    }

    private sealed class DirectReviewer
    {
        public string? Name { get; set; }
        public string? ProfileImage { get; set; }
    }

    private sealed class DirectReviewReply
    {
        public string? Text { get; set; }
        public DateTime? Created { get; set; }
    }

    private sealed class DirectReviewPagination
    {
        public bool HasMore { get; set; }
        public string? NextCursor { get; set; }
    }

    private sealed class ZernioRawAnalyticsSinglePostResponse
    {
        public string? PostId { get; set; }
        public string? LatePostId { get; set; }
        public string? Status { get; set; }
        public string? Content { get; set; }
        public DateTime? ScheduledFor { get; set; }
        public DateTime? PublishedAt { get; set; }
        public ZernioRawAnalyticsFields? Analytics { get; set; }
        public List<ZernioRawPlatformPostMetrics>? PlatformAnalytics { get; set; }
        public string? Platform { get; set; }
        public string? PlatformPostUrl { get; set; }
        public bool? IsExternal { get; set; }
        public string? SyncStatus { get; set; }
        public string? Message { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? MediaType { get; set; }
        public List<ZernioRawPostMediaItem>? MediaItems { get; set; }
    }

    private sealed class ZernioRawAnalyticsFields
    {
        public int? Impressions { get; set; }
        public int? Reach { get; set; }
        public int? Likes { get; set; }
        public int? Comments { get; set; }
        public int? Shares { get; set; }
        public int? Saves { get; set; }
        public int? Clicks { get; set; }
        public int? Views { get; set; }
        public decimal? EngagementRate { get; set; }
        public string? LastUpdated { get; set; }
    }

    private sealed class ZernioRawPlatformPostMetrics
    {
        public string? Platform { get; set; }
        public string? Status { get; set; }
        public string? PlatformPostId { get; set; }
        public string? AccountId { get; set; }
        public string? AccountUsername { get; set; }
        public ZernioRawAnalyticsFields? Analytics { get; set; }
        public string? SyncStatus { get; set; }
        public string? PlatformPostUrl { get; set; }
        public string? ErrorMessage { get; set; }
    }

    private sealed class ZernioRawPostMediaItem
    {
        public string? Type { get; set; }
        public string? Url { get; set; }
        public string? Thumbnail { get; set; }
    }

    private sealed class ZernioRawAnalyticsListResponse
    {
        public ZernioRawAnalyticsOverview? Overview { get; set; }
        public List<ZernioRawAnalyticsListPost>? Posts { get; set; }
        public ZernioRawPagination? Pagination { get; set; }
        public List<ZernioRawAccount>? Accounts { get; set; }
        public bool? HasAnalyticsAccess { get; set; }
    }

    private sealed class ZernioRawAnalyticsOverview
    {
        public int? TotalPosts { get; set; }
        public int? PublishedPosts { get; set; }
        public int? ScheduledPosts { get; set; }
        public DateTime? LastSync { get; set; }
        public ZernioRawAnalyticsDataStaleness? DataStaleness { get; set; }
    }

    private sealed class ZernioRawAnalyticsDataStaleness
    {
        public int? StaleAccountCount { get; set; }
        public bool? SyncTriggered { get; set; }
    }

    private sealed class ZernioRawAnalyticsListPost
    {
        public string? _Id { get; set; }
        public string? LatePostId { get; set; }
        public string? Content { get; set; }
        public DateTime? ScheduledFor { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? Status { get; set; }
        public ZernioRawAnalyticsFields? Analytics { get; set; }
        public List<ZernioRawPlatformPostMetrics>? Platforms { get; set; }
        public string? Platform { get; set; }
        public string? PlatformPostUrl { get; set; }
        public bool? IsExternal { get; set; }
        public string? ProfileId { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? MediaType { get; set; }
        public List<ZernioRawPostMediaItem>? MediaItems { get; set; }
    }

    private sealed class ZernioRawAccount
    {
        public string? _Id { get; set; }
        public string? Platform { get; set; }
        public string? Username { get; set; }
        public string? DisplayName { get; set; }
        public string? ProfilePicture { get; set; }
        public string? ProfileId { get; set; }
        public long? FollowersCount { get; set; }
        public DateTime? FollowersLastUpdated { get; set; }
    }

    private sealed class ZernioRawInboxVolume
    {
        public bool? Success { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public ZernioRawInboxVolumeSummary? Summary { get; set; }
        public List<ZernioRawInboxDailyTotals>? Timeseries { get; set; }
        public List<ZernioRawInboxPlatformBreakdown>? ByPlatform { get; set; }
    }

    private sealed class ZernioRawInboxVolumeSummary
    {
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Read { get; set; }
        public long? Failed { get; set; }
        public long? UniqueConversations { get; set; }
    }

    private sealed class ZernioRawInboxDailyTotals
    {
        public string? Date { get; set; }
        public long? Sent { get; set; }
        public long? Received { get; set; }
        public long? Read { get; set; }
        public long? Failed { get; set; }
    }

    private sealed class ZernioRawInboxPlatformBreakdown
    {
        public string? Platform { get; set; }
        public long? Sent { get; set; }
        public long? Received { get; set; }
        public long? Read { get; set; }
        public long? Failed { get; set; }
    }

    private sealed class ZernioRawInboxTopAccounts
    {
        public bool? Success { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public List<ZernioRawInboxTopAccount>? Accounts { get; set; }
    }

    private sealed class ZernioRawInboxTopAccount
    {
        public string? AccountId { get; set; }
        public string? Platform { get; set; }
        public string? DisplayName { get; set; }
        public string? Username { get; set; }
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Total { get; set; }
        public long? Conversations { get; set; }
        public double? MedianResponseSeconds { get; set; }
        public long? RepliedCount { get; set; }
    }

    private sealed class ZernioRawInboxSourceBreakdown
    {
        public bool? Success { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public List<ZernioRawInboxSourceRow>? Sources { get; set; }
    }

    private sealed class ZernioRawInboxSourceRow
    {
        public string? Source { get; set; }
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Read { get; set; }
        public List<ZernioRawInboxSourcePlatform>? ByPlatform { get; set; }
    }

    private sealed class ZernioRawInboxSourcePlatform
    {
        public string? Platform { get; set; }
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Read { get; set; }
    }

    private sealed class ZernioRawInboxResponseTime
    {
        public bool? Success { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public ZernioRawInboxResponseTimeSummary? Summary { get; set; }
        public List<ZernioRawInboxHistogramBucket>? Histogram { get; set; }
    }

    private sealed class ZernioRawInboxResponseTimeSummary
    {
        public long? SampleSize { get; set; }
        public double? MedianSeconds { get; set; }
        public double? P90Seconds { get; set; }
        public double? P99Seconds { get; set; }
        public double? MeanSeconds { get; set; }
        public double? FastestSeconds { get; set; }
        public double? SlowestSeconds { get; set; }
    }

    private sealed class ZernioRawInboxHistogramBucket
    {
        public string? Bucket { get; set; }
        public double? LowerSeconds { get; set; }
        public double? UpperSeconds { get; set; }
        public long? Count { get; set; }
    }

    private sealed class ZernioRawInboxHeatmap
    {
        public bool? Success { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public List<ZernioRawInboxHeatmapBucket>? Buckets { get; set; }
    }

    private sealed class ZernioRawInboxHeatmapBucket
    {
        public int? Dow { get; set; }
        public int? Hour { get; set; }
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Read { get; set; }
    }

    private sealed class ZernioRawInboxConversationsList
    {
        public bool? Success { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public List<ZernioRawInboxConversationItem>? Items { get; set; }
        public ZernioRawInboxPagination? Pagination { get; set; }
    }

    private sealed class ZernioRawInboxConversationItem
    {
        public string? ConversationId { get; set; }
        public string? Mongoid { get; set; }
        public string? AccountId { get; set; }
        public string? Platform { get; set; }
        public string? ParticipantName { get; set; }
        public string? ParticipantUsername { get; set; }
        public string? ParticipantPicture { get; set; }
        public string? LastMessage { get; set; }
        public long? TotalMessages { get; set; }
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Read { get; set; }
        public long? Failed { get; set; }
        public DateTime? FirstMessageAt { get; set; }
        public DateTime? LastMessageAt { get; set; }
    }

    private sealed class ZernioRawInboxPagination
    {
        public int? Page { get; set; }
        public int? Limit { get; set; }
        public long? Total { get; set; }
        public int? TotalPages { get; set; }
        public bool? HasMore { get; set; }
    }

    private sealed class ZernioRawInboxConversationDetail
    {
        public bool? Success { get; set; }
        public string? ConversationId { get; set; }
        public string? Mongoid { get; set; }
        public string? Platform { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public ZernioRawInboxConversationSummary? Summary { get; set; }
        public List<ZernioRawInboxDailyTotals>? Timeseries { get; set; }
        public List<ZernioRawInboxBySourceRow>? BySource { get; set; }
    }

    private sealed class ZernioRawInboxConversationSummary
    {
        public long? Received { get; set; }
        public long? Sent { get; set; }
        public long? Read { get; set; }
        public long? Failed { get; set; }
        public long? TotalMessages { get; set; }
        public DateTime? FirstMessageAt { get; set; }
        public DateTime? LastMessageAt { get; set; }
    }

    private sealed class ZernioRawInboxBySourceRow
    {
        public string? Source { get; set; }
        public long? Count { get; set; }
    }

    // ── Webhook Management Methods ─────────────────────────────────────

    public async Task<ZernioWebhookListResponseDto> ListWebhooksAsync(
        CancellationToken cancellationToken = default)
    {
        var config = _postsApi.Configuration;
        var baseUrl = config.BasePath.TrimEnd('/');

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v1/webhooks/settings");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.AccessToken);

        using var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(15);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var raw = JsonSerializer.Deserialize<ZernioRawWebhookListResponse>(json, _jsonOptions);

        var webhooks = raw?.Webhooks?
            .Select(w => new ZernioWebhookSettingsDto(
                w._id ?? string.Empty,
                w.Name ?? string.Empty,
                w.Url ?? string.Empty,
                w.Secret,
                w.Events ?? new List<string>(),
                w.IsActive,
                w.LastFiredAt,
                w.FailureCount))
            .ToList() ?? new List<ZernioWebhookSettingsDto>();

        return new ZernioWebhookListResponseDto(webhooks);
    }

    public async Task<ZernioWebhookResponseDto> CreateWebhookAsync(
        ZernioWebhookCreateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var config = _postsApi.Configuration;
        var baseUrl = config.BasePath.TrimEnd('/');

        var body = new
        {
            name = request.Name,
            url = request.Url,
            secret = request.Secret,
            events = request.Events,
            isActive = request.IsActive
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/webhooks/settings");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.AccessToken);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(body, _jsonOptions),
            Encoding.UTF8,
            "application/json");

        using var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(15);
        using var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

        var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Failed to create Zernio webhook. Status: {Status}, Response: {Response}",
                httpResponse.StatusCode, responseJson);
            return new ZernioWebhookResponseDto(false, null);
        }

        var raw = JsonSerializer.Deserialize<ZernioRawWebhookResponse>(responseJson, _jsonOptions);
        var webhook = MapRawWebhook(raw?.Webhook);
        return new ZernioWebhookResponseDto(raw?.Success ?? false, webhook);
    }

    public async Task<ZernioWebhookResponseDto> UpdateWebhookAsync(
        ZernioWebhookUpdateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var config = _postsApi.Configuration;
        var baseUrl = config.BasePath.TrimEnd('/');

        var body = new Dictionary<string, object>
        {
            ["_id"] = request.Id
        };
        if (request.Name != null) body["name"] = request.Name;
        if (request.Url != null) body["url"] = request.Url;
        if (request.Secret != null) body["secret"] = request.Secret;
        if (request.Events != null) body["events"] = request.Events;
        if (request.IsActive != null) body["isActive"] = request.IsActive.Value;

        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, $"{baseUrl}/v1/webhooks/settings");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.AccessToken);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(body, _jsonOptions),
            Encoding.UTF8,
            "application/json");

        using var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(15);
        using var httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);

        var responseJson = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Failed to update Zernio webhook. Status: {Status}, Response: {Response}",
                httpResponse.StatusCode, responseJson);
            return new ZernioWebhookResponseDto(false, null);
        }

        var raw = JsonSerializer.Deserialize<ZernioRawWebhookResponse>(responseJson, _jsonOptions);
        var webhook = MapRawWebhook(raw?.Webhook);
        return new ZernioWebhookResponseDto(raw?.Success ?? false, webhook);
    }

    // ── Webhook private helpers ────────────────────────────────────────

    private static ZernioWebhookSettingsDto? MapRawWebhook(ZernioRawWebhookSettings? raw)
    {
        if (raw == null) return null;
        return new ZernioWebhookSettingsDto(
            raw._id ?? string.Empty,
            raw.Name ?? string.Empty,
            raw.Url ?? string.Empty,
            raw.Secret,
            raw.Events ?? new List<string>(),
            raw.IsActive,
            raw.LastFiredAt,
            raw.FailureCount);
    }

    private sealed class ZernioRawWebhookListResponse
    {
        public List<ZernioRawWebhookSettings>? Webhooks { get; set; }
    }

    private sealed class ZernioRawWebhookResponse
    {
        public bool Success { get; set; }
        public ZernioRawWebhookSettings? Webhook { get; set; }
    }

    private sealed class ZernioRawWebhookSettings
    {
        public string? _id { get; set; }
        public string? Name { get; set; }
        public string? Url { get; set; }
        public string? Secret { get; set; }
        public List<string>? Events { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastFiredAt { get; set; }
        public int FailureCount { get; set; }
    }
}
