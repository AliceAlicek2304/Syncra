using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public sealed class InboxRepository : Repository<InboxConversation>, IInboxRepository
{
    public InboxRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<InboxConversation>> GetConversationsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxConversations
            .Where(c => c.WorkspaceId == workspaceId)
            .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<InboxConversation?> GetConversationByIdAsync(
        Guid workspaceId,
        Guid conversationId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxConversations
            .FirstOrDefaultAsync(
                c => c.Id == conversationId && c.WorkspaceId == workspaceId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<InboxMessage>> GetMessagesAsync(
        Guid workspaceId,
        Guid conversationId,
        int limit = 50,
        DateTime? before = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.InboxMessages
            .Where(m => m.WorkspaceId == workspaceId
                     && m.InboxConversationId == conversationId)
            .AsQueryable();

        if (before.HasValue)
        {
            query = query.Where(m => m.SentAtUtc < before.Value);
        }

        return await query
            .OrderByDescending(m => m.SentAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<InboxConversation?> GetConversationByZernioIdAsync(
        Guid workspaceId,
        string zernioConversationId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxConversations
            .FirstOrDefaultAsync(
                c => c.WorkspaceId == workspaceId
                  && c.ZernioConversationId == zernioConversationId,
                cancellationToken);
    }

    public async Task<InboxMessage?> GetMessageByZernioIdAsync(
        Guid workspaceId,
        string zernioMessageId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxMessages
            .FirstOrDefaultAsync(
                m => m.WorkspaceId == workspaceId
                  && m.ZernioMessageId == zernioMessageId,
                cancellationToken);
    }

    public async Task AddConversationAsync(InboxConversation conversation)
    {
        await _context.InboxConversations.AddAsync(conversation);
    }

    public async Task AddMessageAsync(InboxMessage message)
    {
        await _context.InboxMessages.AddAsync(message);
    }

    public async Task<int> GetUnreadTotalAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxConversations
            .Where(c => c.WorkspaceId == workspaceId && !c.IsRead)
            .SumAsync(c => c.UnreadCount, cancellationToken);
    }
}
