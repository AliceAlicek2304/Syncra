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

public sealed record ZernioUploadDirectResult(
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("filename")] string Filename,
    [property: JsonPropertyName("contentType")] string? ContentType,
    [property: JsonPropertyName("size")] long? Size
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

public sealed record ZernioMetricsDto(
    long Impressions,
    long Reach,
    long Likes,
    long Comments,
    long Shares,
    long Saves,
    long Clicks,
    long Views);

public sealed record ZernioDailyMetricsDto(
    IReadOnlyList<ZernioDailyDataPointDto> DailyData,
    IReadOnlyList<ZernioPlatformBreakdownDto> PlatformBreakdown);

public sealed record ZernioDailyDataPointDto(
    string Date,
    int PostCount,
    IReadOnlyDictionary<string, int> Platforms,
    ZernioMetricsDto Metrics);

public sealed record ZernioPlatformBreakdownDto(
    string Platform,
    int PostCount,
    long Impressions,
    long Reach,
    long Likes,
    long Comments,
    long Shares,
    long Saves,
    long Clicks,
    long Views);

public sealed record ZernioPostAnalyticsDto(
    string? PostId = null,
    string? LatePostId = null,
    string? Status = null,
    string? Content = null,
    DateTime? ScheduledFor = null,
    DateTime? PublishedAt = null,
    PostAnalyticsFields? Analytics = null,
    IReadOnlyList<ZernioPlatformPostMetricsDto>? PlatformAnalytics = null,
    string? Platform = null,
    string? PlatformPostUrl = null,
    bool? IsExternal = null,
    string? SyncStatus = null,
    string? Message = null,
    string? ThumbnailUrl = null,
    string? MediaType = null,
    IReadOnlyList<ZernioPostMediaItemDto>? MediaItems = null)
{
    public bool SyncPending =>
        string.Equals(SyncStatus, "pending", StringComparison.OrdinalIgnoreCase);

    public static ZernioPostAnalyticsDto Empty { get; } = new(
        Analytics: new PostAnalyticsFields());
}

public sealed record PostAnalyticsFields(
    int Impressions = 0,
    int Reach = 0,
    int Likes = 0,
    int Comments = 0,
    int Shares = 0,
    int Saves = 0,
    int Clicks = 0,
    int Views = 0,
    decimal EngagementRate = 0m,
    DateTime? LastUpdated = null);

public sealed record ZernioPlatformPostMetricsDto(
    string? Platform = null,
    string? Status = null,
    string? PlatformPostId = null,
    string? AccountId = null,
    string? AccountUsername = null,
    PostAnalyticsFields? Analytics = null,
    string? SyncStatus = null,
    string? PlatformPostUrl = null,
    string? ErrorMessage = null);

public sealed record ZernioPostMediaItemDto(
    string? Type = null,
    string? Url = null,
    string? Thumbnail = null);

public sealed record ZernioAnalyticsOverviewDto(
    int? TotalPosts = null,
    int? PublishedPosts = null,
    int? ScheduledPosts = null,
    DateTime? LastSync = null,
    ZernioAnalyticsDataStalenessDto? DataStaleness = null);

public sealed record ZernioAnalyticsDataStalenessDto(
    int? StaleAccountCount = null,
    bool? SyncTriggered = null);

public sealed record ZernioAnalyticsListPostDto(
    string? Id = null,
    string? LatePostId = null,
    string? Content = null,
    DateTime? ScheduledFor = null,
    DateTime? PublishedAt = null,
    string? Status = null,
    PostAnalyticsFields? Analytics = null,
    IReadOnlyList<ZernioPlatformPostMetricsDto>? Platforms = null,
    string? Platform = null,
    string? PlatformPostUrl = null,
    bool? IsExternal = null,
    string? ProfileId = null,
    string? ThumbnailUrl = null,
    string? MediaType = null,
    IReadOnlyList<ZernioPostMediaItemDto>? MediaItems = null);

public sealed record ZernioAnalyticsPaginationDto(
    int? Page = null,
    int? Limit = null,
    int? Total = null,
    int? Pages = null);

public sealed record ZernioPostAnalyticsListDto(
    ZernioAnalyticsOverviewDto? Overview = null,
    IReadOnlyList<ZernioAnalyticsListPostDto>? Posts = null,
    ZernioAnalyticsPaginationDto? Pagination = null,
    IReadOnlyList<ZernioAccountDto>? Accounts = null,
    bool? HasAnalyticsAccess = null);

// ── Best-time DTOs ──────────────────────────────────────────

public sealed record ZernioBestTimeDto(
    IReadOnlyList<ZernioBestTimeSlotDto> Slots);

public sealed record ZernioBestTimeSlotDto(
    int DayOfWeek,    // 0=Monday, 6=Sunday (UTC)
    int Hour,         // 0-23 (UTC)
    double AvgEngagement,
    int PostCount);

public sealed record ZernioContentDecayResponseDto(
    IReadOnlyList<ZernioContentDecayBucketDto> Buckets);

public sealed record ZernioContentDecayBucketDto(
    int BucketOrder,
    string BucketLabel,
    double AvgPctOfFinal,
    int PostCount);

// ── Facebook Page Insights DTOs ──────────────────────────────

public sealed record ZernioFacebookPageInsightsResponseDto(
    bool Success,
    string AccountId,
    string Platform,
    ZernioDateRangeDto DateRange,
    string MetricType,
    IReadOnlyDictionary<string, ZernioFacebookPageInsightsMetricDto> Metrics,
    string? DataDelay = null);

public sealed record ZernioFacebookPageInsightsMetricDto(
    double Total,
    IReadOnlyList<ZernioFacebookPageInsightsValueDto>? Values = null);

public sealed record ZernioFacebookPageInsightsValueDto(
    string Date,
    double Value);

public sealed record ZernioDateRangeDto(
    string Since,
    string Until);

// ── Google Business Performance DTOs ────────────────────────────

public sealed record ZernioGoogleBusinessPerformanceResponseDto(
    bool Success,
    string AccountId,
    string Platform,
    ZernioGoogleBusinessDateRangeDto DateRange,
    IReadOnlyDictionary<string, ZernioGoogleBusinessPerformanceMetricDto> Metrics,
    string? DataDelay = null);

public sealed record ZernioGoogleBusinessDateRangeDto(
    string StartDate,
    string EndDate);

public sealed record ZernioGoogleBusinessPerformanceMetricDto(
    int Total,
    IReadOnlyList<ZernioGoogleBusinessPerformanceValueDto> Values);

public sealed record ZernioGoogleBusinessPerformanceValueDto(
    string Date,
    int Value);

// ── Instagram Account Insights DTOs ─────────────────────────────

public sealed record ZernioInstagramAccountInsightsResponseDto(
    bool Success,
    string AccountId,
    string Platform,
    ZernioDateRangeDto DateRange,
    string? MetricType,
    string? Breakdown,
    IReadOnlyDictionary<string, ZernioInstagramAccountInsightsMetricDto> Metrics,
    string? DataDelay = null);

public sealed record ZernioInstagramAccountInsightsMetricDto(
    decimal Total,
    IReadOnlyList<ZernioInstagramAccountInsightsValueDto>? Values = null,
    IReadOnlyList<ZernioInstagramAccountInsightsBreakdownDto>? Breakdowns = null);

public sealed record ZernioInstagramAccountInsightsValueDto(
    string Date,
    decimal Value);

public sealed record ZernioInstagramAccountInsightsBreakdownDto(
    string Dimension,
    decimal Value);

// ── Instagram Demographics DTOs ──────────────────────────────────

public sealed record ZernioInstagramDemographicsResponseDto(
    bool Success,
    string AccountId,
    string Platform,
    string? Metric,
    string? Timeframe,
    IReadOnlyDictionary<string, IReadOnlyList<ZernioInstagramDemographicDimensionDto>> Demographics,
    string? Note = null);

public sealed record ZernioInstagramDemographicDimensionDto(
    string Dimension,
    int Value);

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

public sealed record ZernioFollowerStatsDateRangeDto(
    DateTime? From,
    DateTime? To);

public sealed record ZernioFollowerStatsAccountDto(
    [property: JsonPropertyName("_id")] string Id,
    string Platform,
    string Username,
    string DisplayName,
    string? ProfilePicture,
    int CurrentFollowers,
    DateTime LastUpdated,
    int Growth,
    float GrowthPercentage,
    int DataPoints);

public sealed record ZernioFollowerStatsResponseDto(
    IReadOnlyList<ZernioFollowerStatsAccountDto> Accounts,
    IReadOnlyDictionary<string, IReadOnlyList<ZernioFollowerStatsDataPointDto>>? Stats,
    ZernioFollowerStatsDateRangeDto? DateRange,
    string? Granularity);

public sealed record ZernioFollowerStatsDataPointDto(
    DateOnly Date,
    int Followers);

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
    [property: JsonPropertyName("tasks")] IReadOnlyList<string>? Tasks,
    [property: JsonPropertyName("fan_count")] long? FanCount,
    [property: JsonPropertyName("picture")] ZernioFacebookPagePicture? Picture
);

public sealed record ZernioFacebookPagePicture(
    [property: JsonPropertyName("data")] ZernioFacebookPagePictureData Data
);

public sealed record ZernioFacebookPagePictureData(
    [property: JsonPropertyName("height")] int Height,
    [property: JsonPropertyName("is_silhouette")] bool IsSilhouette,
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("width")] int Width
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

// ── TikTok Creator Info DTOs ──────────────────────────────────────────

public sealed record ZernioTikTokCreatorInfoDto(
    [property: JsonPropertyName("creator_info")] ZernioTikTokCreatorInfoDetails? CreatorInfo
);

public sealed record ZernioTikTokCreatorInfoDetails(
    [property: JsonPropertyName("privacy_level_options")] IReadOnlyList<string>? PrivacyLevelOptions,
    [property: JsonPropertyName("comment_disabled")] bool? CommentDisabled,
    [property: JsonPropertyName("duet_disabled")] bool? DuetDisabled,
    [property: JsonPropertyName("stitch_disabled")] bool? StitchDisabled,
    [property: JsonPropertyName("max_video_post_duration_sec")] int? MaxVideoPostDurationSec,
    [property: JsonPropertyName("commercial_content_type_options")] IReadOnlyList<string>? CommercialContentTypeOptions
);

// ── Comment action response DTOs ─────────────────────────────────────────────

public sealed record ZernioCommentActionResponseDto(
    string? Status = null,
    string? CommentId = null,
    string? MessageId = null,
    string? Platform = null);

public sealed record ZernioLikeActionResponseDto(
    bool Liked,
    string? Status = null,
    string? CommentId = null,
    string? Platform = null,
    string? LikeUri = null);

public sealed record ZernioReplyResponseDto(
    string CommentId,
    string? Cid = null,
    bool IsReply = false);

public sealed record ZernioDeleteCommentResponseDto(
    bool Success,
    string? Message = null);

// ── Private-reply CTA (Facebook/Messenger) ───────────────────────────────────

public sealed record ZernioPrivateReplyQuickReplyDto(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("payload")] string? Payload = null,
    [property: JsonPropertyName("imageUrl")] string? ImageUrl = null);

public sealed record ZernioPrivateReplyButtonDto(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("url")] string? Url = null,
    [property: JsonPropertyName("payload")] string? Payload = null,
    [property: JsonPropertyName("phone_number")] string? PhoneNumber = null);

public sealed record ZernioPrivateReplyRequestDto(
    string AccountId,
    string Message,
    IReadOnlyList<ZernioPrivateReplyQuickReplyDto>? QuickReplies = null,
    IReadOnlyList<ZernioPrivateReplyButtonDto>? Buttons = null);

// ── Google Business Search Keywords ──────────────────────────────────────────

public sealed record ZernioGoogleBusinessSearchKeywordsResponseDto(
    bool Success,
    string AccountId,
    string Platform,
    ZernioMonthRangeDto MonthRange,
    IReadOnlyList<ZernioSearchKeywordDto> Keywords,
    string? Note);

public sealed record ZernioMonthRangeDto(string StartMonth, string EndMonth);

public sealed record ZernioSearchKeywordDto(string Keyword, int Impressions);

// ── LinkedIn Aggregate Analytics DTOs ──────────────────────────────────────────

public sealed record ZernioLinkedInAggregateAnalyticsResponseDto(
    string AccountId,
    string Platform,
    string AccountType,
    string Username,
    string Aggregation,
    ZernioLinkedInAggregateAnalyticsDateRangeDto? DateRange,
    ZernioLinkedInAggregateAnalyticsDataDto? AnalyticsTotal,
    ZernioLinkedInAggregateAnalyticsDailyDataDto? AnalyticsDaily,
    IReadOnlyList<string>? SkippedMetrics,
    string? Note,
    DateTime LastUpdated
);

public sealed record ZernioLinkedInAggregateAnalyticsDateRangeDto(
    string StartDate,
    string EndDate
);

public sealed record ZernioLinkedInAggregateAnalyticsDataDto(
    int Impressions,
    int Reach,
    int Reactions,
    int Comments,
    int Shares,
    int Saves,
    int Sends,
    decimal EngagementRate
);

public sealed record ZernioLinkedInAggregateAnalyticsDailyDataDto(
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Impressions,
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Reach, // null or empty usually, but kept for parity if needed
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Reactions,
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Comments,
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Shares,
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Saves,
    IReadOnlyList<ZernioLinkedInAggregateAnalyticsDailyPointDto>? Sends
);

public sealed record ZernioLinkedInAggregateAnalyticsDailyPointDto(
    string Date,
    int Count
);

// ── LinkedIn Post Analytics DTOs ─────────────────────────────────────────────

public sealed record ZernioLinkedInPostAnalyticsResponseDto(
    string AccountId,
    string Platform,
    string AccountType,
    string Username,
    string PostUrn,
    ZernioLinkedInPostAnalyticsDataDto? Analytics,
    DateTime LastUpdated
);

public sealed record ZernioLinkedInPostAnalyticsDataDto(
    int Impressions,
    int Reach,
    int Likes,
    int Comments,
    int Shares,
    int Saves,
    int Sends,
    int Clicks,
    int Views,
    decimal EngagementRate
);

// ── LinkedIn Post Reactions DTOs ─────────────────────────────────────────────

public sealed record ZernioLinkedInPostReactionsResponseDto(
    string AccountId,
    string Platform,
    string AccountType,
    string Username,
    string PostUrn,
    IReadOnlyList<ZernioLinkedInPostReactionDto>? Reactions,
    ZernioLinkedInPostReactionsPaginationDto? Pagination,
    DateTime LastUpdated
);

public sealed record ZernioLinkedInPostReactionDto(
    string ReactionType,
    string? ReactionLabel,
    DateTime ReactedAt,
    ZernioLinkedInPostReactionAuthorDto? From
);

public sealed record ZernioLinkedInPostReactionAuthorDto(
    string Urn,
    string? Name,
    string? Headline,
    string? Username,
    string? ProfilePicture,
    string? ProfileUrl
);

public sealed record ZernioLinkedInPostReactionsPaginationDto(
    bool HasMore,
    string? Cursor,
    int? Total,
    bool HasTotal
);

// ── Posting Frequency DTOs ───────────────────────────────────────────────────

public sealed record ZernioPostingFrequencyResponseDto(
    IReadOnlyList<ZernioPostingFrequencyItemDto>? Frequency
);

public sealed record ZernioPostingFrequencyItemDto(
    string Platform,
    int PostsPerWeek,
    decimal AvgEngagementRate,
    decimal AvgEngagement,
    int WeeksCount
);

// ── YouTube Demographics DTOs ────────────────────────────────────────────────

public sealed record ZernioYouTubeDemographicsResponseDto(
    bool Success,
    string AccountId,
    string Platform,
    ZernioDateRangeDto DateRange,
    IReadOnlyDictionary<string, IReadOnlyList<ZernioYouTubeDemographicDimensionDto>> Demographics,
    string? Note = null);

public sealed record ZernioYouTubeDemographicDimensionDto(
    string Dimension,
    double Value);

// ── YouTube Daily Views DTOs ─────────────────────────────────────────────────

public sealed record ZernioYouTubeDailyViewsResponseDto(
    bool Success,
    string VideoId,
    ZernioYouTubeDailyViewsDateRangeDto DateRange,
    int TotalViews,
    IReadOnlyList<ZernioYouTubeDailyViewDataDto> DailyViews,
    DateTime? LastSyncedAt = null,
    ZernioYouTubeScopeStatusDto? ScopeStatus = null);

public sealed record ZernioYouTubeDailyViewsDateRangeDto(
    string StartDate,
    string EndDate);

public sealed record ZernioYouTubeDailyViewDataDto(
    string Date,
    int Views,
    decimal EstimatedMinutesWatched,
    decimal AverageViewDuration,
    int SubscribersGained,
    int SubscribersLost,
    int Likes,
    int Comments,
    int Shares);

public sealed record ZernioYouTubeScopeStatusDto(
    bool HasAnalyticsScope);

// ── Post Timeline DTOs ─────────────────────────────────────────────────────

public sealed record ZernioPostTimelineResponseDto(
    IReadOnlyList<ZernioPostTimelineItemDto>? Timeline
);

public sealed record ZernioPostTimelineItemDto(
    string Date,
    string Platform,
    string PlatformPostId,
    int Impressions,
    int Reach,
    int Likes,
    int Comments,
    int Shares,
    int Saves,
    int Clicks,
    int Views);

// =================== Inbox Analytics ===================

public sealed record ZernioInboxVolumeResponseDto(
    bool Success,
    string From,
    string To,
    ZernioInboxVolumeSummaryDto Summary,
    IReadOnlyList<ZernioInboxDailyTotalsDto> Timeseries,
    IReadOnlyList<ZernioInboxPlatformBreakdownDto> ByPlatform);

public sealed record ZernioInboxVolumeSummaryDto(
    long Received,
    long Sent,
    long Read,
    long Failed,
    long UniqueConversations);

public sealed record ZernioInboxDailyTotalsDto(
    string Date,
    long Sent,
    long Received,
    long Read,
    long Failed);

public sealed record ZernioInboxPlatformBreakdownDto(
    string Platform,
    long Sent,
    long Received,
    long Read,
    long Failed);

public sealed record ZernioInboxTopAccountsResponseDto(
    bool Success,
    string From,
    string To,
    IReadOnlyList<ZernioInboxTopAccountDto> Accounts);

public sealed record ZernioInboxTopAccountDto(
    string AccountId,
    string Platform,
    string DisplayName,
    string Username,
    long Received,
    long Sent,
    long Total,
    long Conversations,
    double MedianResponseSeconds,
    long RepliedCount);

public sealed record ZernioInboxSourceBreakdownResponseDto(
    bool Success,
    string From,
    string To,
    IReadOnlyList<ZernioInboxSourceBreakdownRowDto> Sources);

public sealed record ZernioInboxSourceBreakdownRowDto(
    string Source,
    long Received,
    long Sent,
    long Read,
    IReadOnlyList<ZernioInboxSourcePlatformDto> ByPlatform);

public sealed record ZernioInboxSourcePlatformDto(
    string Platform,
    long Received,
    long Sent,
    long Read);

public sealed record ZernioInboxResponseTimeResponseDto(
    bool Success,
    string From,
    string To,
    ZernioInboxResponseTimeSummaryDto Summary,
    IReadOnlyList<ZernioInboxResponseHistogramBucketDto> Histogram);

public sealed record ZernioInboxResponseTimeSummaryDto(
    long SampleSize,
    double MedianSeconds,
    double P90Seconds,
    double P99Seconds,
    double MeanSeconds,
    double FastestSeconds,
    double SlowestSeconds);

public sealed record ZernioInboxResponseHistogramBucketDto(
    string Bucket,
    double LowerSeconds,
    double UpperSeconds,
    long Count);

public sealed record ZernioInboxHeatmapResponseDto(
    bool Success,
    string From,
    string To,
    IReadOnlyList<ZernioInboxHeatmapBucketDto> Buckets);

public sealed record ZernioInboxHeatmapBucketDto(
    int Dow,
    int Hour,
    long Received,
    long Sent,
    long Read);

public sealed record ZernioInboxConversationsListResponseDto(
    bool Success,
    string From,
    string To,
    IReadOnlyList<ZernioInboxConversationListItemDto> Items,
    ZernioInboxPaginationDto Pagination);

public sealed record ZernioInboxConversationListItemDto(
    string ConversationId,
    string Mongoid,
    string AccountId,
    string Platform,
    string ParticipantName,
    string ParticipantUsername,
    string ParticipantPicture,
    string LastMessage,
    long TotalMessages,
    long Received,
    long Sent,
    long Read,
    long Failed,
    DateTime FirstMessagedAt,
    DateTime LastMessagedAt);

public sealed record ZernioInboxPaginationDto(
    int Page,
    int Limit,
    long Total,
    int TotalPages,
    bool HasMore);

public sealed record ZernioInboxConversationDetailDto(
    bool Success,
    string ConversationId,
    string Mongoid,
    string Platform,
    string From,
    string To,
    ZernioInboxConversationSummaryDto Summary,
    IReadOnlyList<ZernioInboxDailyTotalsDto> Timeseries,
    IReadOnlyList<ZernioInboxBySourceRowDto> BySource);

public sealed record ZernioInboxConversationSummaryDto(
    long Received,
    long Sent,
    long Read,
    long Failed,
    long TotalMessages,
    DateTime FirstMessagedAt,
    DateTime LastMessagedAt);

public sealed record ZernioInboxBySourceRowDto(
    string Source,
    long Count);

public sealed record InboxAnalyticsFilters(
    DateTime? FromDate,
    DateTime? ToDate,
    string? ProfileId,
    string? Platform,
    string? AccountId,
    string? Source,
    string? Action,
    int? Limit,
    int? Page,
    string? SortBy,
    string? Order);

// ── Webhook Management DTOs ─────────────────────────────────────────

public sealed record ZernioWebhookSettingsDto(
    string Id,
    string Name,
    string Url,
    string? Secret,
    List<string> Events,
    bool IsActive,
    DateTime? LastFiredAt,
    int FailureCount);

public sealed record ZernioWebhookListResponseDto(
    List<ZernioWebhookSettingsDto> Webhooks);

public sealed record ZernioWebhookCreateRequestDto(
    string Name,
    string Url,
    string? Secret,
    List<string> Events,
    bool IsActive = true);

public sealed record ZernioWebhookUpdateRequestDto(
    string Id,
    string? Name = null,
    string? Url = null,
    string? Secret = null,
    List<string>? Events = null,
    bool? IsActive = null);

public sealed record ZernioWebhookResponseDto(
    bool Success,
    ZernioWebhookSettingsDto? Webhook);


