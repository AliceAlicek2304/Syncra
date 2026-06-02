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
        string? cursor = null,
        CancellationToken cancellationToken = default);

    Task<ZernioSendMessageResponseDto> SendInboxMessageAsync(
        string profileId,
        string conversationId,
        string accountId,
        string text,
        CancellationToken cancellationToken = default);

    // ── Inbox Comment methods ───────────────────────────────────

    Task<ZernioInboxCommentsPageDto> ListInboxCommentsAsync(
        string profileId,
        DateTime? since = null,
        string? cursor = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<ZernioReplyToCommentResponseDto> ReplyToInboxCommentAsync(
        string profileId,
        string zernioPostId,
        string accountId,
        string message,
        string? commentId = null,
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
        string profileId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);

    Task<ZernioPostAnalyticsDto> GetPostAnalyticsAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default);

    Task<ZernioBestTimeDto> GetBestTimeAsync(
        string profileId,
        string? platform = null,
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

    // ── Follower Stats methods ────────────────────────────────

    Task<ZernioFollowerStatsResponseDto> GetFollowerStatsAsync(
        string accountIds,
        string profileId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? granularity = null,
        CancellationToken cancellationToken = default);

    // ── Bulk Account Health methods ───────────────────────────

    Task<ZernioBulkHealthResponseDto> GetAllAccountsHealthAsync(
        string profileId,
        string? platform = null,
        string? status = null,
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
}
