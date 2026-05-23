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
    Task<int> GetUnreadTotalAsync(Guid workspaceId, CancellationToken cancellationToken = default);
}
