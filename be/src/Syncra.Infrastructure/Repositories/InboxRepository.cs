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

    // ── Comments ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<InboxComment>> GetCommentsAsync(
        Guid workspaceId,
        int limit = 50,
        DateTime? before = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.InboxComments
            .Where(c => c.WorkspaceId == workspaceId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(platform))
            query = query.Where(c => c.Platform == platform.ToLowerInvariant());

        if (!string.IsNullOrEmpty(accountId))
            query = query.Where(c => c.ZernioAccountId == accountId);

        if (before.HasValue)
            query = query.Where(c => c.ReceivedAtUtc < before.Value);

        return await query
            .OrderByDescending(c => c.ReceivedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<InboxComment?> GetCommentByIdAsync(
        Guid workspaceId,
        Guid commentId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxComments
            .FirstOrDefaultAsync(
                c => c.Id == commentId && c.WorkspaceId == workspaceId,
                cancellationToken);
    }

    // ── Reviews ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<InboxReview>> GetReviewsAsync(
        Guid workspaceId,
        int limit = 50,
        DateTime? before = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.InboxReviews
            .Where(r => r.WorkspaceId == workspaceId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(platform))
            query = query.Where(r => r.Platform == platform.ToLowerInvariant());

        if (!string.IsNullOrEmpty(accountId))
            query = query.Where(r => r.ZernioAccountId == accountId);

        if (before.HasValue)
            query = query.Where(r => r.ReceivedAtUtc < before.Value);

        return await query
            .OrderByDescending(r => r.ReceivedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<InboxReview?> GetReviewByIdAsync(
        Guid workspaceId,
        Guid reviewId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxReviews
            .FirstOrDefaultAsync(
                r => r.Id == reviewId && r.WorkspaceId == workspaceId,
                cancellationToken);
    }

    public async Task<InboxReview?> GetReviewByZernioIdAsync(
        Guid workspaceId,
        string zernioReviewId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxReviews
            .FirstOrDefaultAsync(
                r => r.WorkspaceId == workspaceId
                  && r.ZernioReviewId == zernioReviewId,
                cancellationToken);
    }
}
