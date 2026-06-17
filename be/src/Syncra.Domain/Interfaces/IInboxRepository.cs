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

    Task<IReadOnlyList<InboxMessage>> GetMessagesByZernioIdsAsync(
        Guid workspaceId,
        string[] zernioMessageIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InboxConversation>> GetConversationsByZernioIdsAsync(
        Guid workspaceId,
        string[] zernioConversationIds,
        CancellationToken cancellationToken = default);

    Task AddConversationAsync(InboxConversation conversation);
    Task AddMessageAsync(InboxMessage message);
    Task AddMessagesAsync(IReadOnlyList<InboxMessage> messages);
    Task DeleteMessageAsync(InboxMessage message);
    Task<int> GetUnreadTotalAsync(Guid workspaceId, CancellationToken cancellationToken = default);

    // ── Commented Posts ─────────────────────────────────────────────────────

    Task<IReadOnlyList<InboxCommentedPost>> GetCommentedPostsAsync(
        Guid workspaceId,
        int limit = 50,
        DateTime? before = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default);

    Task<InboxCommentedPost?> GetCommentedPostByIdAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default);

    Task<InboxCommentedPost?> GetCommentedPostByZernioPostIdAsync(
        Guid workspaceId,
        string zernioPostId,
        CancellationToken cancellationToken = default);

    Task AddCommentedPostAsync(InboxCommentedPost post);
    Task UpdateCommentedPostAsync(InboxCommentedPost post);
    
    Task<bool> HasSentPrivateReplyAsync(
        Guid workspaceId,
        string zernioCommentId,
        CancellationToken cancellationToken = default);

    Task AddPrivateReplyRecordAsync(
        InboxCommentPrivateReply record,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InboxCommentPrivateReply>> GetPrivateRepliesForWorkspaceAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InboxCommentPrivateReply>> GetPrivateRepliesByCommentIdsAsync(
        Guid workspaceId,
        HashSet<string> commentIds,
        CancellationToken cancellationToken = default);

    // ── Comment Threads (cache layer) ───────────────────────────────────────

    Task<InboxCommentThread?> GetByPostAsync(
        Guid workspaceId,
        string zernioPostId,
        CancellationToken cancellationToken = default);

    Task UpsertAsync(InboxCommentThread thread);

    Task DeleteCommentThreadAsync(
        Guid workspaceId,
        string zernioPostId,
        CancellationToken cancellationToken = default);

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
