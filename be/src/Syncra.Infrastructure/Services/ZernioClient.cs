using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ZernioClient> _logger;
    private readonly ZernioOptions _options;

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
                "facebook" => await SelectFacebookPageAsync(profileId, tempToken, selectedId, selectedName, cancellationToken),
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
                return;
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
                ["dateFrom"] = dateFrom?.ToString("o"),
                ["dateTo"] = dateTo?.ToString("o")
            };

            var query = string.Join("&",
                queryParams.Where(kv => kv.Value is not null)
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
        if (fbData == null && !request.Platforms.Any(p => string.Equals(p.Platform, "facebook", StringComparison.OrdinalIgnoreCase)))
            return null;

        return new FacebookPlatformData(
            fbData?.Draft ?? request.IsDraft ?? false,
            ParseEnum<FacebookPlatformData.ContentTypeEnum>(fbData?.ContentType),
            fbData?.Title,
            fbData?.FirstComment,
            fbData?.PageId,
            null,
            null,
            fbData?.CarouselLink
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

    public async Task<ZernioLinkedInOrganizationsResponseDto> GetLinkedInOrganizationsAsync(
        string accountId,
        bool? refresh = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Zernio");
            var url = $"/v1/accounts/{accountId}/linkedin-organizations";
            if (refresh == true) url += "?refresh=true";

            var response = await client.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = System.Text.Json.JsonSerializer.Deserialize<LinkedInOrganizationsResponse>(json, _jsonOptions);

            var organizations = (result?.Organizations ?? [])
                .Select(o => new ZernioLinkedInOrganizationDto(
                    o.Id ?? string.Empty,
                    o.Name ?? string.Empty,
                    o.VanityName,
                    o.LogoUrl))
                .ToList();

            return new ZernioLinkedInOrganizationsResponseDto(
                organizations,
                result?.SelectedOrganizationUrn,
                result?.Cached ?? false);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
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
            var client = _httpClientFactory.CreateClient("Zernio");
            var url = $"/v1/accounts/{accountId}/linkedin-organization";

            var request = new { organizationUrn = selectedOrganizationUrn };
            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(request, _jsonOptions),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await client.PutAsync(url, content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = System.Text.Json.JsonSerializer.Deserialize<LinkedInOrganizationItem>(json, _jsonOptions);
            if (result is not null)
            {
                return new ZernioLinkedInOrganizationDto(
                    result.Id ?? string.Empty,
                    result.Name ?? string.Empty,
                    result.VanityName,
                    result.LogoUrl);
            }
            return null;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
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
}
