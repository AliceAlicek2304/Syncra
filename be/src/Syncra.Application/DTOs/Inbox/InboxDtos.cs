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

public sealed record SendInboxMessageRequest(
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