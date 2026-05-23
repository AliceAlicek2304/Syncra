namespace Syncra.Application.DTOs.Inbox;

public sealed record InboxConversationDto(
    Guid Id,
    string ZernioConversationId,
    string Platform,
    string? ParticipantName,
    string? ParticipantAvatarUrl,
    string? LastMessageText,
    DateTime? LastMessageAtUtc,
    int UnreadCount,
    bool IsRead,
    Guid? SocialAccountId,
    DateTime CreatedAtUtc);

public sealed record InboxMessageDto(
    Guid Id,
    Guid InboxConversationId,
    string ZernioMessageId,
    string Direction,
    string? BodyText,
    DateTime SentAtUtc,
    string? ZernioAccountId,
    DateTime CreatedAtUtc);

public sealed record InboxSendMessageRequest(
    string Text,
    string AccountId);

public sealed record SendInboxMessageResponse(
    string ZernioMessageId,
    DateTime SentAtUtc);

public sealed record InboxCursorPage<T>(
    IReadOnlyList<T> Items,
    InboxPageMetadata Pagination);

public sealed record InboxPageMetadata(
    bool HasMore,
    string? NextCursor);

public sealed record ZernioInboxConversationItemDto(
    string Id,
    string Platform,
    string? ParticipantName,
    string? ParticipantUsername,
    string? ParticipantPicture,
    string? LastMessageText,
    DateTime? LastMessageAt,
    string? Status);

public sealed record ZernioInboxMessageItemDto(
    string Id,
    string? Text,
    string? Direction,
    DateTime? SentAt,
    string? PlatformMessageId,
    bool? IsRead);

public sealed record ZernioInboxConversationsPageDto(
    IReadOnlyList<ZernioInboxConversationItemDto> Items,
    bool HasMore,
    string? NextCursor);

public sealed record ZernioInboxMessagesPageDto(
    IReadOnlyList<ZernioInboxMessageItemDto> Items,
    bool HasMore,
    string? NextCursor);

public sealed record ZernioSendMessageResponseDto(
    string MessageId,
    DateTime SentAtUtc);

public sealed record InboxSummaryDto(
    int UnreadTotal);

public sealed record ZernioInboxCommentItemDto(
    string Id,
    string Platform,
    string Content,
    string? Picture,
    string? Permalink,
    DateTime CreatedTime,
    int CommentCount,
    string? Cid);

public sealed record ZernioInboxCommentsPageDto(
    IReadOnlyList<ZernioInboxCommentItemDto> Items,
    bool HasMore,
    string? NextCursor);

public sealed record ZernioReplyToCommentResponseDto(
    string CommentId,
    string? Cid);

public sealed record InboxCommentDto(
    Guid Id,
    string ZernioCommentId,
    Guid? SocialAccountId,
    string Platform,
    string AuthorName,
    string? AuthorUsername,
    string? AuthorPicture,
    string BodyText,
    string? ZernioPostId,
    string? ZernioAccountId,
    string? PostPreviewCaption,
    string? PostPreviewThumbnailUrl,
    bool IsRead,
    DateTime ReceivedAtUtc,
    DateTime CreatedAtUtc);

public sealed record InboxSendCommentReplyRequest(
    string Message);

public sealed record InboxSendCommentReplyResponse(
    string CommentId,
    string? Cid);

// ── Review DTOs ─────────────────────────────────────────────────────────────

public sealed record ZernioInboxReviewItemDto(
    string Id,
    string Platform,
    string? AccountId,
    string? AccountUsername,
    string? ReviewerName,
    string? ReviewerImageUrl,
    int Rating,
    string? Text,
    DateTime Created,
    bool HasReply,
    string? ReplyText,
    DateTime? ReplyCreated);

public sealed record ZernioInboxReviewsPageDto(
    IReadOnlyList<ZernioInboxReviewItemDto> Items,
    bool HasMore,
    string? NextCursor);

public sealed record ZernioReplyToReviewResponseDto(
    string ReplyId,
    string Text,
    DateTime CreatedAt);

public sealed record InboxReviewDto(
    Guid Id,
    string ZernioReviewId,
    Guid? SocialAccountId,
    string Platform,
    string ReviewerName,
    string? ReviewerImageUrl,
    int StarRating,
    string? ReviewText,
    bool HasReply,
    string? ReplyText,
    DateTime? ReplyCreatedAtUtc,
    bool IsRead,
    DateTime ReceivedAtUtc,
    DateTime CreatedAtUtc);

public sealed record InboxSendReviewReplyRequest(
    string Message);

public sealed record InboxSendReviewReplyResponse(
    string ReviewReplyId);

/// <summary>
/// Represents the current state of inbox backfill for a workspace (D-11).
/// </summary>
public sealed record InboxSyncStatusDto(
    bool IsSyncing,
    DateTime? LastSyncedAtUtc);