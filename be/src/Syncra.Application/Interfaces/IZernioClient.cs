using Syncra.Application.DTOs.Inbox;
using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Interfaces;

public interface IZernioClient
{
    Task<ZernioConnectUrlResult> GetConnectUrlAsync(
        string profileId,
        string platform,
        string redirectUrl,
        bool? headless = null,
        CancellationToken cancellationToken = default);

    Task<ZernioListAccountsResponseDto> ListAccountsAsync(
        string profileId,
        string? platform = null,
        bool? includeOverLimit = null,
        int? page = null,
        int? limit = null,
        CancellationToken cancellationToken = default);

    Task DisconnectAccountAsync(
        string profileId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<ZernioProfileDto> ProvisionProfileAsync(
        string workspaceId,
        string name,
        CancellationToken cancellationToken = default);

    Task<ZernioProfileDto> GetProfileAsync(
        string profileId,
        CancellationToken cancellationToken = default);

    Task<ZernioProfileDto> UpdateProfileAsync(
        string profileId,
        string name,
        CancellationToken cancellationToken = default);

    Task DeleteProfileAsync(
        string profileId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ZernioProfileDto>> ListProfilesAsync(
        bool? includeOverLimit = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ZernioSelectOptionDto>> ListSelectOptionsAsync(
        string profileId,
        string platform,
        string tempToken,
        CancellationToken cancellationToken = default);

    Task<ZernioTikTokCreatorInfoDto> GetTikTokCreatorInfoAsync(
        string accountId,
        string? mediaType = null,
        CancellationToken cancellationToken = default);

    Task<ZernioSelectResultDto> SelectOptionAsync(
        string profileId,
        string platform,
        string tempToken,
        string selectedId,
        string? selectedName,
        CancellationToken cancellationToken = default);

    Task<ZernioCreatePostResult> CreatePostAsync(
        ZernioCreatePostRequest request,
        CancellationToken cancellationToken = default);

    Task<ZernioCreatePostResult> UpdatePostAsync(
        ZernioCreatePostRequest request,
        CancellationToken cancellationToken = default);

    Task<ZernioPresignResponse> GetMediaPresignedUrlAsync(
        string fileName,
        string mimeType,
        CancellationToken cancellationToken = default);

    Task<string> UploadMediaToZernioAsync(
        string uploadUrl,
        Stream content,
        string mimeType,
        CancellationToken cancellationToken = default);

    Task<ZernioUploadDirectResult> UploadMediaDirectAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    Task UpdatePostAsync(
        string zernioPostId,
        Syncra.Application.DTOs.Zernio.ZernioUpdatePostRequestDto request,
        CancellationToken cancellationToken = default);

    Task RetryPostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default);

    Task DeletePostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default);

    Task UnpublishPostAsync(
        string zernioPostId,
        string platform,
        CancellationToken cancellationToken = default);

    Task<ZernioPostListResponseDto> ListPostsAsync(
        int? page = null,
        int? limit = null,
        string? status = null,
        string? platform = null,
        string? search = null,
        string? sortBy = null,
        string? accountId = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);

    // ── Inbox DM methods ────────────────────────────────────────

    Task<ZernioInboxConversationsPageDto> ListInboxConversationsAsync(
        string profileId,
        string? cursor = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInboxMessagesPageDto> ListInboxMessagesAsync(
        string conversationId,
        string accountId,
        string? cursor = null,
        CancellationToken cancellationToken = default);

    Task<ZernioSendMessageResponseDto> SendInboxMessageAsync(
        string profileId,
        string conversationId,
        InboxSendMessageRequest request,
        CancellationToken cancellationToken = default);

    Task<InboxConversationDetailsDto> GetInboxConversationAsync(
        string conversationId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<InboxCreateConversationResponseDto> CreateInboxConversationAsync(
        CreateInboxConversationRequest request,
        CancellationToken cancellationToken = default);

    Task<InboxUpdateConversationResponseDto> UpdateInboxConversationAsync(
        string conversationId,
        UpdateInboxConversationRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> MarkConversationReadAsync(
        string conversationId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<InboxEditMessageResponseDto> EditInboxMessageAsync(
        string conversationId,
        string messageId,
        EditInboxMessageRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteInboxMessageAsync(
        string conversationId,
        string messageId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<bool> AddMessageReactionAsync(
        string conversationId,
        string messageId,
        AddMessageReactionRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> RemoveMessageReactionAsync(
        string conversationId,
        string messageId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<bool> SendTypingIndicatorAsync(
        string conversationId,
        SendTypingIndicatorRequest request,
        CancellationToken cancellationToken = default);

    // ── Inbox Comment methods ───────────────────────────────────

    Task<ZernioInboxCommentsPageDto> ListInboxCommentsAsync(
        string profileId,
        DateTime? since = null,
        string? cursor = null,
        string? platform = null,
        string? accountId = null,
        int? minComments = null,
        string? sortBy = null,
        string? sortOrder = null,
        int? limit = null,
        CancellationToken cancellationToken = default);

    Task<ZernioReplyResponseDto> ReplyToInboxCommentAsync(
        string profileId,
        string zernioPostId,
        string accountId,
        string message,
        string? commentId = null,
        string? parentCid = null,
        string? rootUri = null,
        string? rootCid = null,
        CancellationToken cancellationToken = default);

    Task<ZernioDeleteCommentResponseDto> DeleteInboxCommentAsync(
        string zernioPostId,
        string accountId,
        string commentId,
        CancellationToken cancellationToken = default);

    Task<ZernioPostCommentsResponseDto> GetInboxPostCommentsAsync(
        string zernioPostId,
        string accountId,
        string? subreddit = null,
        int? limit = null,
        string? cursor = null,
        string? commentId = null,
        string? selfAccountId = null,
        string? platform = null,
        CancellationToken cancellationToken = default);

    Task<ZernioCommentActionResponseDto> HideInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<ZernioCommentActionResponseDto> UnhideInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<ZernioLikeActionResponseDto> LikeInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        string? cid = null,
        CancellationToken cancellationToken = default);

    Task<ZernioLikeActionResponseDto> UnlikeInboxCommentAsync(
        string zernioPostId,
        string commentId,
        string accountId,
        string? likeUri = null,
        CancellationToken cancellationToken = default);

    Task<ZernioCommentActionResponseDto> SendPrivateReplyToCommentAsync(
        string zernioPostId,
        string commentId,
        ZernioPrivateReplyRequestDto request,
        CancellationToken cancellationToken = default);

    // ── Inbox Review methods ────────────────────────────────────

    Task<ZernioInboxReviewsPageDto> ListInboxReviewsAsync(
        string profileId,
        string? cursor = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<ZernioReplyToReviewResponseDto> ReplyToInboxReviewAsync(
        string profileId,
        string reviewId,
        string accountId,
        string message,
        CancellationToken cancellationToken = default);

    // ── Analytics methods ───────────────────────────────────────

    Task<ZernioDailyMetricsDto> GetDailyMetricsAsync(
        string? profileId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default);

    Task<ZernioPostAnalyticsDto> GetPostAnalyticsAsync(
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
        CancellationToken cancellationToken = default);

    Task<ZernioPostAnalyticsListDto> GetAnalyticsListAsync(
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
        CancellationToken cancellationToken = default);

    Task<ZernioBestTimeDto> GetBestTimeAsync(
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default);

    Task<ZernioContentDecayResponseDto> GetContentDecayAsync(
        string? platform = null,
        string? profileId = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default);

    Task<ZernioFacebookPageInsightsResponseDto> GetFacebookPageInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default);

    Task<ZernioGoogleBusinessPerformanceResponseDto> GetGoogleBusinessPerformanceAsync(
        string accountId,
        string? metrics = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInstagramAccountInsightsResponseDto> GetInstagramAccountInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        string? breakdown = null,
        CancellationToken cancellationToken = default);

    // ── YouTube Daily Views methods ────────────────────────────────

    Task<ZernioYouTubeDailyViewsResponseDto> GetYouTubeDailyViewsAsync(
        string videoId,
        string accountId,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        CancellationToken cancellationToken = default);

    // ── YouTube Channel Insights methods ───────────────────────────

    Task<ZernioInstagramAccountInsightsResponseDto> GetYouTubeChannelInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default);

    // ── YouTube Demographics methods ───────────────────────────────

    Task<ZernioYouTubeDemographicsResponseDto> GetYouTubeDemographicsAsync(
        string accountId,
        string? breakdown = null,
        string? startDate = null,
        string? endDate = null,
        CancellationToken cancellationToken = default);

    // ── TikTok Account Insights methods ────────────────────────────

    Task<ZernioInstagramAccountInsightsResponseDto> GetTikTokAccountInsightsAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default);

    // ── Account Health methods ──────────────────────────────────

    Task<ZernioAccountHealthDto> GetAccountHealthAsync(
        string accountId,
        CancellationToken cancellationToken = default);

    // ── Facebook Page methods ───────────────────────────────────

    Task<ZernioFacebookPagesResponseDto> GetFacebookPagesAsync(
        string accountId,
        bool? refresh = null,
        CancellationToken cancellationToken = default);

    Task<ZernioFacebookPageDto?> UpdateFacebookPageAsync(
        string accountId,
        string selectedPageId,
        CancellationToken cancellationToken = default);

    // ── Facebook Connect select-page methods ───────────────────

    Task<ZernioFacebookConnectPagesResponseDto> GetFacebookConnectPagesAsync(
        string profileId,
        string tempToken,
        CancellationToken cancellationToken = default);

    Task<ZernioFacebookConnectSelectResponse> SelectFacebookConnectPageAsync(
        ZernioFacebookConnectSelectRequest request,
        CancellationToken cancellationToken = default);

    // ── LinkedIn Organization methods ────────────────────────────

    Task<ZernioLinkedInOrganizationsResponseDto> GetLinkedInOrganizationsAsync(
        string accountId,
        bool? refresh = null,
        CancellationToken cancellationToken = default);

    Task<ZernioLinkedInOrganizationDto?> UpdateLinkedInOrganizationAsync(
        string accountId,
        string selectedOrganizationUrn,
        CancellationToken cancellationToken = default);

    // ── Account Update methods ────────────────────────────────

    Task<ZernioUpdateAccountResponseDto> UpdateAccountAsync(
        string accountId,
        ZernioUpdateAccountRequestDto request,
        CancellationToken cancellationToken = default);

    // ── Move Account methods ──────────────────────────────────

    Task<ZernioMoveAccountResponseDto> MoveAccountToProfileAsync(
        string accountId,
        string targetProfileId,
        CancellationToken cancellationToken = default);

    // ── Follower Stats methods ──────────────────────────────────────────────

    Task<ZernioFollowerStatsResponseDto> GetFollowerStatsAsync(
        string? accountIds = null,
        string? profileId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? granularity = null,
        CancellationToken cancellationToken = default);

    // ── Bulk Account Health methods ─────────────────────────────────────────

    Task<ZernioBulkHealthResponseDto> GetAllAccountsHealthAsync(
        string profileId,
        string? platform = null,
        string? status = null,
        CancellationToken cancellationToken = default);

    // ── Google Business Analytics methods ─────────────────────────────────────

    Task<ZernioGoogleBusinessSearchKeywordsResponseDto> GetGoogleBusinessSearchKeywordsAsync(
        string accountId,
        string? startMonth = null,
        string? endMonth = null,
        CancellationToken cancellationToken = default);

    // ── Instagram Demographics methods ────────────────────────────────────

    Task<ZernioInstagramDemographicsResponseDto> GetInstagramDemographicsAsync(
        string accountId,
        string? metric = null,
        string? breakdown = null,
        string? timeframe = null,
        CancellationToken cancellationToken = default);

    // ── Instagram Follower History methods ────────────────────────────────

    Task<ZernioInstagramAccountInsightsResponseDto> GetInstagramFollowerHistoryAsync(
        string accountId,
        string? metrics = null,
        string? since = null,
        string? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default);

    // ── LinkedIn Org Aggregate Analytics methods ───────────────────────────

    Task<ZernioInstagramAccountInsightsResponseDto> GetLinkedInOrgAggregateAnalyticsAsync(
        string accountId,
        string? metrics = null,
        DateOnly? since = null,
        DateOnly? until = null,
        string? metricType = null,
        CancellationToken cancellationToken = default);

    // ── LinkedIn Aggregate Analytics methods ──────────────────────────────

    Task<ZernioLinkedInAggregateAnalyticsResponseDto> GetLinkedInAggregateAnalyticsAsync(
        string accountId,
        string? aggregation = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? metrics = null,
        CancellationToken cancellationToken = default);

    // ── LinkedIn Post Analytics methods ───────────────────────────────────

    Task<ZernioLinkedInPostAnalyticsResponseDto> GetLinkedInPostAnalyticsAsync(
        string accountId,
        string urn,
        CancellationToken cancellationToken = default);

    Task<ZernioLinkedInPostReactionsResponseDto> GetLinkedInPostReactionsAsync(
        string accountId,
        string urn,
        int? limit = null,
        string? cursor = null,
        CancellationToken cancellationToken = default);

    // ── Posting Frequency methods ─────────────────────────────────────────

    Task<ZernioPostingFrequencyResponseDto> GetPostingFrequencyAsync(
        string? platform = null,
        string? profileId = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default);

    // ── Post Timeline methods ─────────────────────────────────────────────

    Task<ZernioPostTimelineResponseDto> GetPostTimelineAsync(
        string postId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);

    // ── Inbox Analytics methods ───────────────────────────────────────────

    Task<ZernioInboxVolumeResponseDto> GetInboxVolumeAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInboxTopAccountsResponseDto> GetInboxTopAccountsAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? source = null,
        int? limit = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInboxSourceBreakdownResponseDto> GetInboxSourceBreakdownAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInboxResponseTimeResponseDto> GetInboxResponseTimeAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInboxHeatmapResponseDto> GetInboxHeatmapAsync(
        DateTime fromDate,
        DateTime? toDate = null,
        string? profileId = null,
        string? platform = null,
        string? accountId = null,
        string? source = null,
        string? action = null,
        CancellationToken cancellationToken = default);

    Task<ZernioInboxConversationsListResponseDto> ListInboxConversationsAnalyticsAsync(
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
        CancellationToken cancellationToken = default);

    Task<ZernioInboxConversationDetailDto> GetInboxConversationAnalyticsAsync(
        string conversationId,
        DateTime fromDate,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);
}
