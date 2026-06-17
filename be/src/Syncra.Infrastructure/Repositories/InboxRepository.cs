using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public sealed class InboxRepository : Repository<InboxConversation>, IInboxRepository
{
    private readonly IUnitOfWork _unitOfWork;

    public InboxRepository(AppDbContext context, IUnitOfWork unitOfWork) : base(context)
    {
        _unitOfWork = unitOfWork;
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
            .Include(c => c.SocialAccount)
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

    public async Task<IReadOnlyList<InboxMessage>> GetMessagesByZernioIdsAsync(
        Guid workspaceId,
        string[] zernioMessageIds,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxMessages
            .Where(m => m.WorkspaceId == workspaceId
                     && zernioMessageIds.Contains(m.ZernioMessageId))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InboxConversation>> GetConversationsByZernioIdsAsync(
        Guid workspaceId,
        string[] zernioConversationIds,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxConversations
            .Where(c => c.WorkspaceId == workspaceId
                     && zernioConversationIds.Contains(c.ZernioConversationId))
            .ToListAsync(cancellationToken);
    }

    public async Task AddConversationAsync(InboxConversation conversation)
    {
        await _context.InboxConversations.AddAsync(conversation);
    }

    public async Task AddMessageAsync(InboxMessage message)
    {
        await _context.InboxMessages.AddAsync(message);
    }

    public async Task AddMessagesAsync(IReadOnlyList<InboxMessage> messages)
    {
        await _context.InboxMessages.AddRangeAsync(messages);
    }

    public async Task DeleteMessageAsync(InboxMessage message)
    {
        _context.InboxMessages.Remove(message);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<int> GetUnreadTotalAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxConversations
            .Where(c => c.WorkspaceId == workspaceId && !c.IsRead)
            .SumAsync(c => c.UnreadCount, cancellationToken);
    }

    // ── Commented Posts ─────────────────────────────────────────────────────

    public async Task<IReadOnlyList<InboxCommentedPost>> GetCommentedPostsAsync(
        Guid workspaceId,
        int limit = 50,
        DateTime? before = null,
        string? platform = null,
        string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.InboxCommentedPosts
            .Include(c => c.SocialAccount)
            .Where(c => c.WorkspaceId == workspaceId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(platform))
            query = query.Where(c => c.Platform == platform.ToLowerInvariant());

        if (!string.IsNullOrEmpty(accountId))
            query = query.Where(c => c.ZernioAccountId == accountId);

        if (before.HasValue)
            query = query.Where(c => c.ReceivedAtUtc < before.Value);

        var posts = await query
            .OrderByDescending(c => c.ReceivedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var post in posts)
        {
            if (string.IsNullOrEmpty(post.ZernioAccountId) && post.SocialAccount != null)
            {
                post.SetZernioAccountId(post.SocialAccount.ExternalAccountId);
                changed = true;
            }
        }

        if (changed)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return posts;
    }

    public async Task<InboxCommentedPost?> GetCommentedPostByIdAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default)
    {
        var post = await _context.InboxCommentedPosts
            .Include(c => c.SocialAccount)
            .FirstOrDefaultAsync(
                c => c.Id == postId && c.WorkspaceId == workspaceId,
                cancellationToken);

        if (post != null && string.IsNullOrEmpty(post.ZernioAccountId) && post.SocialAccount != null)
        {
            post.SetZernioAccountId(post.SocialAccount.ExternalAccountId);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return post;
    }

    public async Task<InboxCommentedPost?> GetCommentedPostByZernioPostIdAsync(
        Guid workspaceId,
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(zernioPostId))
            return null;

        var post = await _context.InboxCommentedPosts
            .Include(c => c.SocialAccount)
            .FirstOrDefaultAsync(
                c => c.WorkspaceId == workspaceId
                  && (c.ZernioPostId == zernioPostId || c.ZernioPostId.EndsWith("_" + zernioPostId)),
                cancellationToken);

        if (post != null && string.IsNullOrEmpty(post.ZernioAccountId) && post.SocialAccount != null)
        {
            post.SetZernioAccountId(post.SocialAccount.ExternalAccountId);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return post;
    }

    public async Task AddCommentedPostAsync(InboxCommentedPost post)
    {
        await _context.InboxCommentedPosts.AddAsync(post);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task UpdateCommentedPostAsync(InboxCommentedPost post)
    {
        _context.InboxCommentedPosts.Update(post);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<bool> HasSentPrivateReplyAsync(
        Guid workspaceId,
        string zernioCommentId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxCommentPrivateReplies
            .AnyAsync(r => r.WorkspaceId == workspaceId && r.ZernioCommentId == zernioCommentId, cancellationToken);
    }

    public async Task AddPrivateReplyRecordAsync(
        InboxCommentPrivateReply record,
        CancellationToken cancellationToken = default)
    {
        await _context.InboxCommentPrivateReplies.AddAsync(record, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InboxCommentPrivateReply>> GetPrivateRepliesForWorkspaceAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxCommentPrivateReplies
            .Where(r => r.WorkspaceId == workspaceId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InboxCommentPrivateReply>> GetPrivateRepliesByCommentIdsAsync(
        Guid workspaceId,
        HashSet<string> commentIds,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxCommentPrivateReplies
            .Where(r => r.WorkspaceId == workspaceId
                     && commentIds.Contains(r.ZernioCommentId))
            .ToListAsync(cancellationToken);
    }

    public async Task<InboxCommentThread?> GetByPostAsync(
        Guid workspaceId,
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        return await _context.InboxCommentThreads
            .FirstOrDefaultAsync(
                t => t.WorkspaceId == workspaceId && t.ZernioPostId == zernioPostId,
                cancellationToken);
    }

    public async Task UpsertAsync(InboxCommentThread thread)
    {
        var existing = await _context.InboxCommentThreads
            .FirstOrDefaultAsync(t => t.WorkspaceId == thread.WorkspaceId
                                   && t.ZernioPostId == thread.ZernioPostId);

        if (existing == null)
        {
            await _context.InboxCommentThreads.AddAsync(thread);
        }
        else
        {
            existing.Refresh(thread.PayloadJson, thread.ExpiresAtUtc);
        }

        await _unitOfWork.SaveChangesAsync();
    }

    public async Task DeleteCommentThreadAsync(
        Guid workspaceId,
        string zernioPostId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(zernioPostId)) return;

        string? prefix = null;
        if (zernioPostId.Contains('_'))
        {
            prefix = zernioPostId.Split('_')[0];
        }

        var existingThreads = await _context.InboxCommentThreads
            .Where(t => t.WorkspaceId == workspaceId && (
                t.ZernioPostId == zernioPostId ||
                t.ZernioPostId.StartsWith(zernioPostId + "_") ||
                (prefix != null && (t.ZernioPostId == prefix || t.ZernioPostId.StartsWith(prefix + "_")))
            ))
            .ToListAsync(cancellationToken);

        if (existingThreads.Count > 0)
        {
            _context.InboxCommentThreads.RemoveRange(existingThreads);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
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

    public async Task AddReviewAsync(InboxReview review)
    {
        await _context.InboxReviews.AddAsync(review);
        await _unitOfWork.SaveChangesAsync();
    }
}
