using System.Text.Json.Serialization;

namespace Syncra.Application.DTOs.Zernio;

public sealed record ZernioPresignRequest(
    [property: JsonPropertyName("filename")] string Filename,
    [property: JsonPropertyName("contentType")] string ContentType
);

public sealed record ZernioPresignResponse(
    [property: JsonPropertyName("uploadUrl")] string UploadUrl,
    [property: JsonPropertyName("publicUrl")] string PublicUrl
);

public sealed record ZernioConnectUrlResult(string ConnectUrl);

public sealed record ZernioAccountDto(
    string Id,
    string Platform,
    string DisplayName,
    bool IsConnected,
    string? ProfilePicture = null,
    string? ProfileUrl = null,
    string? Username = null,
    object? Metadata = null,
    string? ProfileId = null,
    long? FollowersCount = null,
    DateTime? FollowersLastUpdated = null,
    string? ParentAccountId = null,
    bool? Enabled = null);

public sealed record ZernioListAccountsResponseDto(
    IReadOnlyList<ZernioAccountDto> Accounts,
    bool HasAnalyticsAccess,
    ZernioListAccountsPaginationDto? Pagination);

public sealed record ZernioListAccountsPaginationDto(
    int? Page,
    int? Limit,
    int? Total,
    int? Pages);

public sealed record ZernioProfileDto(
    string Id,
    string Name);

public sealed record ZernioSelectOptionDto(
    string Id,
    string Name,
    string? AvatarUrl = null);

public sealed record ZernioSelectResultDto(
    string AccountId,
    string Platform,
    string DisplayName,
    string? ProfilePicture);

public sealed record ZernioCreatePostPlatformTarget(
    string Platform,
    string ZernioAccountId);

public sealed record ZernioCreatePostRequest(
    string? Title,
    string Content,
    IReadOnlyList<ZernioCreatePostPlatformTarget> Platforms,
    DateTime? ScheduledForUtc,
    bool PublishNow,
    bool? IsDraft,
    IReadOnlyList<Syncra.Application.DTOs.Posts.PostMediaItemDto>? MediaItems,
    IReadOnlyList<Syncra.Application.DTOs.Posts.PlatformContentDto>? PlatformContents,
    string? PostId = null,
    string? Status = null,
    AllPlatformDataDto? PlatformSpecificData = null,
    TikTokSettingsDto? TiktokSettings = null);

public sealed record ZernioCreatePostResult(
    string ZernioPostId,
    string Status,
    int TargetCount);

public sealed record ZernioUpdatePostRequestDto(
    string Content,
    DateTime? ScheduledForUtc);

// ── Analytics DTOs ─────────────────────────────────────────────

public sealed record ZernioDailyMetricsDto(
    IReadOnlyList<ZernioDailyDataPointDto> DailyData,
    IReadOnlyList<ZernioPlatformBreakdownDto>? PlatformBreakdown);

public sealed record ZernioDailyDataPointDto(
    string Date,
    int PostCount,
    long Impressions,
    long Reach,
    long Likes,
    long Comments,
    long Shares,
    long Saves,
    long Clicks,
    long Views);

public sealed record ZernioPlatformBreakdownDto(
    string Platform,
    int PostCount,
    int Impressions,
    int Reach,
    int Likes,
    int Comments,
    int Shares,
    int Saves,
    int Clicks,
    int Views);

public sealed record ZernioPostAnalyticsDto(
    PostAnalyticsFields Analytics,
    IReadOnlyList<ZernioPlatformPostMetricsDto>? PlatformAnalytics,
    bool SyncPending);

public sealed record PostAnalyticsFields(
    int Impressions,
    int Reach,
    int Likes,
    int Comments,
    int Shares,
    int Saves,
    int Clicks,
    int Views,
    decimal EngagementRate,
    DateTime? LastUpdated);

public sealed record ZernioPlatformPostMetricsDto(
    string Platform,
    string? PlatformPostId,
    string? AccountId,
    string? AccountUsername,
    PostAnalyticsFields? Analytics,
    string? PlatformPostUrl,
    string? ErrorMessage);

// ── Best-time DTOs ──────────────────────────────────────────

public sealed record ZernioBestTimeDto(
    IReadOnlyList<ZernioBestTimeSlotDto> Slots);

public sealed record ZernioBestTimeSlotDto(
    int DayOfWeek,    // 0=Monday, 6=Sunday (UTC)
    int Hour,         // 0-23 (UTC)
    double AvgEngagement,
    int PostCount);

// ── Account Health DTOs ─────────────────────────────────────────

public sealed record ZernioAccountHealthDto(
    string AccountId,
    string Platform,
    string Username,
    string DisplayName,
    string Status,
    ZernioTokenStatusDto TokenStatus,
    ZernioHealthPermissionsDto Permissions,
    IReadOnlyList<string> Issues,
    IReadOnlyList<string> Recommendations);

public sealed record ZernioTokenStatusDto(
    bool Valid,
    DateTime? ExpiresAt,
    string? ExpiresIn,
    bool NeedsRefresh);

public sealed record ZernioHealthPermissionsDto(
    IReadOnlyList<ZernioScopeDto> Posting,
    IReadOnlyList<ZernioScopeDto> Analytics,
    IReadOnlyList<ZernioScopeDto> Optional,
    bool CanPost,
    bool CanFetchAnalytics,
    IReadOnlyList<string> MissingRequired);

public sealed record ZernioScopeDto(
    string Scope,
    bool Granted,
    bool Required);

// ── Facebook Page DTOs ───────────────────────────────────────────

public sealed record ZernioFacebookPageDto(
    string Id,
    string Name,
    string? Username,
    string? Category,
    int? FanCount,
    string? PictureUrl = null);

public sealed record ZernioFacebookPagesResponseDto(
    IReadOnlyList<ZernioFacebookPageDto> Pages,
    string? SelectedPageId,
    bool Cached);

// ── LinkedIn Organization DTOs ─────────────────────────────────────

public sealed record ZernioLinkedInOrganizationDto(
    string Id,
    string Name,
    string? VanityName,
    string? LogoUrl);

public sealed record ZernioLinkedInOrganizationsResponseDto(
    IReadOnlyList<ZernioLinkedInOrganizationDto> Organizations,
    string? SelectedOrganizationUrn,
    bool Cached);

// ── Follower Stats DTOs ───────────────────────────────────────────

public sealed record ZernioFollowerStatsAccountDto(
    string Id,
    string Platform,
    string Username,
    string DisplayName,
    string? ProfilePicture,
    long CurrentFollowers,
    DateTime LastUpdated,
    decimal Growth,
    decimal GrowthPercentage,
    int DataPoints);

public sealed record ZernioFollowerStatsResponseDto(
    IReadOnlyList<ZernioFollowerStatsAccountDto> Accounts,
    IReadOnlyDictionary<string, IReadOnlyList<ZernioFollowerStatsDataPointDto>>? Stats,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Granularity);

public sealed record ZernioFollowerStatsDataPointDto(
    DateOnly Date,
    decimal Followers);

// ── Bulk Account Health DTOs ────────────────────────────────────────

public sealed record ZernioBulkHealthSummaryDto(
    int Total,
    int Healthy,
    int Warning,
    int Error,
    int NeedsReconnect);

public sealed record ZernioBulkHealthItemDto(
    string AccountId,
    string Platform,
    string Username,
    string DisplayName,
    string? Status,
    bool CanPost,
    bool CanFetchAnalytics,
    bool TokenValid,
    DateTime? TokenExpiresAt,
    bool NeedsReconnect,
    IReadOnlyList<string> Issues);

public sealed record ZernioBulkHealthResponseDto(
    ZernioBulkHealthSummaryDto Summary,
    IReadOnlyList<ZernioBulkHealthItemDto> Accounts);

// ── Account Update DTOs ─────────────────────────────────────────────

public sealed record ZernioUpdateAccountRequestDto(
    string? Username,
    string? DisplayName,
    bool? EnableAnalytics,
    bool? EnableInbox);

public sealed record ZernioUpdateAccountResponseDto(
    string Message,
    string? Username,
    string? DisplayName);

// ── Move Account DTOs ────────────────────────────────────────────────

public sealed record ZernioMoveAccountRequestDto(string TargetProfileId);

public sealed record ZernioMoveAccountResponseDto(
    string Message,
    string ProfileId);

// ── Post Listing DTOs ────────────────────────────────────────────────

public sealed record ZernioMediaItemDto(
    string Id,
    string Type,
    string Url,
    string? Filename,
    int? Size,
    string? MimeType);

public sealed record ZernioPostPlatformTargetDto(
    string Platform,
    string AccountId,
    string Status,
    string? PlatformPostId,
    string? PlatformPostUrl,
    DateTime? PublishedAt,
    string? ErrorMessage,
    System.Text.Json.Nodes.JsonNode? PlatformSpecificData = null);

public sealed record ZernioPostListItemDto(
    string Id,
    string? Title,
    string Content,
    string Status,
    DateTime? ScheduledFor,
    string Timezone,
    IReadOnlyList<ZernioPostPlatformTargetDto> Platforms,
    IReadOnlyList<string> Tags,
    IReadOnlyList<ZernioMediaItemDto>? ZernioMediaItems,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt);

public sealed record ZernioPostListResponseDto(
    IReadOnlyList<ZernioPostListItemDto> Posts,
    int Page,
    int Limit,
    int Total,
    int Pages);

// ── Facebook Connect DTOs ──────────────────────────────────────────

public sealed record ZernioFacebookConnectPageDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("username")] string? Username,
    [property: JsonPropertyName("access_token")] string? AccessToken,
    [property: JsonPropertyName("category")] string? Category,
    [property: JsonPropertyName("tasks")] IReadOnlyList<string>? Tasks
);

public sealed record ZernioFacebookConnectPagesResponseDto(
    [property: JsonPropertyName("pages")] IReadOnlyList<ZernioFacebookConnectPageDto> Pages
);

public sealed record ZernioFacebookConnectUserProfile(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("profilePicture")] string ProfilePicture
);

public sealed record ZernioFacebookConnectSelectRequest(
    [property: JsonPropertyName("profileId")] string ProfileId,
    [property: JsonPropertyName("pageId")] string PageId,
    [property: JsonPropertyName("tempToken")] string TempToken,
    [property: JsonPropertyName("userProfile")] ZernioFacebookConnectUserProfile UserProfile,
    [property: JsonPropertyName("redirect_url")] string? RedirectUrl = null
);

public sealed record ZernioFacebookConnectAccountDetails(
    [property: JsonPropertyName("accountId")] string AccountId,
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("username")] string? Username,
    [property: JsonPropertyName("displayName")] string DisplayName,
    [property: JsonPropertyName("profilePicture")] string? ProfilePicture
);

public sealed record ZernioFacebookConnectSelectResponse(
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("redirect_url")] string? RedirectUrl,
    [property: JsonPropertyName("account")] ZernioFacebookConnectAccountDetails Account
);
