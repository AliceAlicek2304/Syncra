using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IInboxRepository
{
    Task<IReadOnlyList<InboxConversation>> GetConversationsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default);

    Task<InboxConversation?> GetConversationByIdAsync(
        Guid workspaceId,
        Guid conversationId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InboxMessage>> GetMessagesAsync(
        Guid workspaceId,
        Guid conversationId,
        int limit = 50,
        DateTime? before = null,
        CancellationToken cancellationToken = default);

    Task<InboxConversation?> GetConversationByZernioIdAsync(
        Guid workspaceId,
        string zernioConversationId,
        CancellationToken cancellationToken = default);

    Task<InboxMessage?> GetMessageByZernioIdAsync(
        Guid workspaceId,
        string zernioMessageId,
        CancellationToken cancellationToken = default);

    Task AddConversationAsync(InboxConversation conversation);
    Task AddMessageAsync(InboxMessage message);
    Task DeleteMessageAsync(InboxMessage message);
    Task<int> GetUnreadTotalAsync(Guid workspaceId, CancellationToken cancellationToken = default);

    // ── Comments ────────────────────────────────────────────────────────────

    Task<IReadOnlyList<InboxComment>> GetCommentsAsync(
        Guid workspaceId,
        int limit = 50,
        DateTime? before = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<InboxComment?> GetCommentByIdAsync(
        Guid workspaceId,
        Guid commentId,
        CancellationToken cancellationToken = default);

    Task<InboxComment?> GetCommentByZernioIdAsync(
        Guid workspaceId,
        string zernioCommentId,
        CancellationToken cancellationToken = default);

    Task AddCommentAsync(InboxComment comment);

    // ── Reviews ─────────────────────────────────────────────────────────────

    Task<IReadOnlyList<InboxReview>> GetReviewsAsync(
        Guid workspaceId,
        int limit = 50,
        DateTime? before = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<InboxReview?> GetReviewByIdAsync(
        Guid workspaceId,
        Guid reviewId,
        CancellationToken cancellationToken = default);

    Task<InboxReview?> GetReviewByZernioIdAsync(
        Guid workspaceId,
        string zernioReviewId,
        CancellationToken cancellationToken = default);

    Task AddReviewAsync(InboxReview review);
}
