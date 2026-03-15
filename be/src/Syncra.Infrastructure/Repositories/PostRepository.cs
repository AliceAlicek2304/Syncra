using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class PostRepository : Repository<Post>, IPostRepository
{
    public PostRepository(AppDbContext context) : base(context)
    {
    }

    public override async Task<Post?> GetByIdAsync(Guid id)
    {
        return await _dbSet
            .Include(p => p.Media)
            .Include(p => p.Integration)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<Post?> GetByIdWithMediaAsync(Guid id)
    {
        return await _dbSet
            .Include(p => p.Media)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Post>> GetByWorkspaceIdAsync(Guid workspaceId)
    {
        return await _dbSet
            .Where(p => p.WorkspaceId == workspaceId)
            .Include(p => p.Media)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet
            .Where(p => p.UserId == userId)
            .Include(p => p.Media)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Post>> GetDueScheduledPostsAsync(
        DateTime utcNow,
        int batchSize,
        CancellationToken cancellationToken = default)
    {
        if (batchSize <= 0)
        {
            batchSize = 50;
        }

        return await _dbSet
            .Where(p =>
                (p.Status == PostStatus.Scheduled || p.Status == PostStatus.Publishing) &&
                (DateTime?)p.ScheduledAt <= utcNow)
            .OrderBy(p => (DateTime?)p.ScheduledAt)
            .ThenBy(p => p.Id)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Post> Items, int TotalCount)> GetFilteredAsync(
        Guid workspaceId,
        PostStatus? status = null,
        DateTime? scheduledFromUtc = null,
        DateTime? scheduledToUtc = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet
            .Where(p => p.WorkspaceId == workspaceId)
            .Include(p => p.Media)
            .AsQueryable();

        // Apply filters at database level
        if (status.HasValue)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        // For scheduled time filtering, we need to handle the value object
        // Use a projection to handle ScheduledTime
        if (scheduledFromUtc.HasValue || scheduledToUtc.HasValue)
        {
            // Get all and filter in memory for now (value object comparison)
            // In production, consider using raw SQL or computed columns
            var allPosts = await query.ToListAsync(cancellationToken);

            var filtered = allPosts.Where(p =>
            {
                var scheduled = p.ScheduledAt.UtcValue;
                if (scheduledFromUtc.HasValue && scheduled < scheduledFromUtc.Value)
                    return false;
                if (scheduledToUtc.HasValue && scheduled > scheduledToUtc.Value)
                    return false;
                return true;
            }).ToList();

            var total = filtered.Count;
            var skip = (page - 1) * pageSize;
            var items = filtered
                .OrderByDescending(p => p.CreatedAtUtc)
                .ThenByDescending(p => (DateTime?)p.ScheduledAt)
                .Skip(skip)
                .Take(pageSize)
                .ToList();

            return ((IReadOnlyList<Post>)items, total);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var result = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .ThenByDescending(p => (DateTime?)p.ScheduledAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (result, totalCount);
    }
}
