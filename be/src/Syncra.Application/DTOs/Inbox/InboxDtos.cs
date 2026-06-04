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

public sealed record ZernioMessageAttachmentDto(
    string Id,
    string Type,
    string Url,
    string? Filename,
    string? PreviewUrl);

public sealed record InboxMessageDto(
    Guid Id,
    Guid InboxConversationId,
    string ZernioMessageId,
    string Direction,
    string? BodyText,
    DateTime SentAtUtc,
    string? ZernioAccountId,
    DateTime CreatedAtUtc,
    IReadOnlyList<ZernioMessageAttachmentDto>? Attachments = null);

public sealed record InboxSendMessageRequest(
    string? Text,
    string AccountId,
    string? AttachmentUrl = null,
    string? AttachmentType = null,
    List<InboxQuickReplyDto>? QuickReplies = null,
    List<InboxButtonDto>? Buttons = null,
    InboxTemplateDto? Template = null,
    object? Interactive = null,
    InboxTelegramReplyMarkupDto? ReplyMarkup = null,
    string? ReplyTo = null,
    string? MessagingType = null,
    string? MessageTag = null);

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
    string? Status,
    string? AccountId = null,
    int? UnreadCount = null);

public sealed record ZernioInboxMessageItemDto(
    string Id,
    string? Text,
    string? Direction,
    DateTime? SentAt,
    string? PlatformMessageId,
    bool? IsRead,
    IReadOnlyList<ZernioMessageAttachmentDto>? Attachments = null);

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
    string? Cid,
    string? AccountId = null,
    string? AccountUsername = null,
    int? LikeCount = null,
    string? Subreddit = null,
    bool? IsAd = null,
    string? AdId = null,
    string? Placement = null);

public sealed record ZernioInboxFailedAccountDto(
    string AccountId,
    string? AccountUsername,
    string Platform,
    string Error,
    string? Code,
    int? RetryAfter);

public sealed record ZernioInboxCommentMetaDto(
    int AccountsQueried,
    int AccountsFailed,
    IReadOnlyList<ZernioInboxFailedAccountDto> FailedAccounts,
    DateTime LastUpdated);

public sealed record ZernioInboxCommentsPageDto(
    IReadOnlyList<ZernioInboxCommentItemDto> Items,
    bool HasMore,
    string? NextCursor,
    ZernioInboxCommentMetaDto? Meta = null);

public sealed record InboxCommentedPostItemDto(
    string Id,
    string Platform,
    string? AccountId,
    string? AccountUsername,
    string? Picture,
    string? Permalink,
    DateTime CreatedTime,
    int CommentCount,
    int? LikeCount,
    string? Cid,
    string? Subreddit,
    bool? IsAd,
    string? AdId,
    string? Placement);

public sealed record InboxCommentedPostsResponseDto(
    IReadOnlyList<InboxCommentedPostItemDto> Data,
    InboxPageMetadata Pagination,
    ZernioInboxCommentMetaDto? Meta = null);

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
    int CommentCount,
    string? ZernioTopCommentId,
    bool IsRead,
    DateTime ReceivedAtUtc,
    DateTime CreatedAtUtc);

public sealed record InboxSendCommentReplyRequest(
    string Message);

public sealed record InboxSendCommentReplyResponse(
    string CommentId,
    string? Cid);

// ── Additional Comment API DTOs ─────────────────────────────────────────────

public sealed record ZernioPostCommentItemDto(
    string Id,
    string Message,
    DateTime CreatedTime,
    string? FromId,
    string? FromName,
    string? FromUsername,
    string? FromPicture,
    bool FromIsOwner,
    int LikeCount,
    int ReplyCount,
    string Platform,
    string? Url,
    bool CanReply,
    bool CanDelete,
    bool CanHide,
    bool CanLike,
    bool IsHidden,
    bool IsLiked,
    string? LikeUri,
    string? Cid,
    string? ParentId,
    string? RootUri = null,
    string? RootCid = null,
    IReadOnlyList<ZernioPostCommentItemDto>? Replies = null);

public sealed record ZernioPostMetaDto(
    string? Id,
    string? Caption,
    string? ThumbnailUrl,
    string? Permalink,
    int? LikeCount,
    int? CommentCount,
    string? Platform);

public sealed record ZernioCommentsMetaDto(
    string Platform,
    int? TotalCount,
    bool? HasAdComments,
    string? Subreddit,
    string? AccountId,
    DateTime? LastUpdatedUtc);

public sealed record ZernioPostCommentsResponseDto(
    string Status,
    ZernioPostMetaDto? Post,
    ZernioCommentsMetaDto Meta,
    IReadOnlyList<ZernioPostCommentItemDto> Comments,
    string? Cursor,
    bool HasMore = false);

public sealed record LikeInboxCommentRequest(
    string? Cid = null);

public sealed record SendPrivateReplyRequest(
    string Message);

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

// ── Extended Inbox DTOs and wrapper models ─────────────────────────────────

public sealed record InboxQuickReplyDto(
    string Title,
    string Payload,
    string? ImageUrl = null);

public sealed record InboxButtonDto(
    string Type,
    string Title,
    string? Url = null,
    string? Payload = null,
    string? Phone = null);

public sealed record InboxTemplateDto(
    string Type,
    List<InboxTemplateElementDto> Elements);

public sealed record InboxTemplateElementDto(
    string Title,
    string? Subtitle = null,
    string? ImageUrl = null,
    List<InboxButtonDto>? Buttons = null);

public sealed record InboxTelegramReplyMarkupDto(
    string Type,
    List<List<InboxTelegramButtonDto>> Keyboard,
    bool? OneTime = null);

public sealed record InboxTelegramButtonDto(
    string Text,
    string? CallbackData = null,
    string? Url = null);

public sealed record InboxParticipantDto(
    string Id,
    string Name);

public sealed record InboxInstagramProfileDto(
    bool? IsFollower,
    bool? IsFollowing,
    int? FollowerCount,
    bool? IsVerified,
    DateTime? FetchedAt);

public sealed record InboxConversationDetailsDto(
    string Id,
    string AccountId,
    string AccountUsername,
    string Platform,
    string Status,
    string ParticipantName,
    string ParticipantId,
    string? ParticipantVerifiedType,
    string LastMessage,
    DateTime LastMessageAt,
    DateTime UpdatedTime,
    List<InboxParticipantDto> Participants,
    InboxInstagramProfileDto? InstagramProfile);

public sealed record InboxCreateConversationResponseDto(
    string MessageId,
    string ConversationId,
    string ParticipantId,
    string? ParticipantName,
    string? ParticipantUsername);

public sealed record InboxUpdateConversationResponseDto(
    string Status,
    string Id,
    string AccountId,
    string Platform,
    DateTime UpdatedAt);

public sealed record InboxEditMessageResponseDto(
    int MessageId);

public sealed record CreateInboxConversationRequest(
    string AccountId,
    string? ParticipantId = null,
    string? ParticipantUsername = null,
    string? Message = null,
    bool? SkipDmCheck = null,
    string? TemplateName = null,
    string? TemplateLanguage = null,
    List<string>? TemplateParams = null);

public sealed record UpdateInboxConversationRequest(
    string AccountId,
    string Status);

public sealed record EditInboxMessageRequest(
    string AccountId,
    string Text,
    InboxTelegramReplyMarkupDto? ReplyMarkup = null);

public sealed record AddMessageReactionRequest(
    string AccountId,
    string Emoji);

public sealed record SendTypingIndicatorRequest(
    string AccountId);