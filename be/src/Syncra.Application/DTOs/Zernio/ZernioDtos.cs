namespace Syncra.Application.DTOs.Zernio;

public sealed record ZernioConnectUrlResult(string ConnectUrl);

public sealed record ZernioAccountDto(
    string Id,
    string Platform,
    string DisplayName,
    bool IsConnected);

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
    string Content,
    IReadOnlyList<ZernioCreatePostPlatformTarget> Platforms,
    DateTime? ScheduledForUtc,
    bool PublishNow);

public sealed record ZernioCreatePostResult(
    string ZernioPostId,
    string Status,
    int TargetCount);

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
    int? FanCount);

public sealed record ZernioFacebookPagesResponseDto(
    IReadOnlyList<ZernioFacebookPageDto> Pages,
    string? SelectedPageId,
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
