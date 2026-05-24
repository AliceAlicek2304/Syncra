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
            .Include(p => p.PlatformTargets)
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

    public async Task<int> CountScheduledPostsForZernioAccountAsync(
        Guid workspaceId,
        string zernioAccountId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(p =>
                p.WorkspaceId == workspaceId
                && p.Status == PostStatus.Scheduled
                && p.PlatformTargets.Any(t => t.ZernioAccountId == zernioAccountId))
            .CountAsync(cancellationToken);
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
            .Include(p => p.PlatformTargets)
            .AsQueryable();

        // Apply filters at database level
        if (status.HasValue)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        if (scheduledFromUtc.HasValue)
        {
            query = query.Where(p => (DateTime?)p.ScheduledAt >= scheduledFromUtc.Value);
        }

        if (scheduledToUtc.HasValue)
        {
            query = query.Where(p => (DateTime?)p.ScheduledAt <= scheduledToUtc.Value);
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

    public async Task<Post?> GetByIdWithPlatformTargetsAsync(Guid id)
    {
        return await _dbSet
            .Include(p => p.Media)
            .Include(p => p.Integration)
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Syncra.Domain.Models.Analytics.AnalyticsPostData>> GetAnalyticsDataAsync(
        Guid workspaceId,
        DateTime? sinceUtc = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet
            .AsNoTracking()
            .Where(p => p.WorkspaceId == workspaceId);

        if (sinceUtc.HasValue)
        {
            query = query.Where(p => p.PublishedAtUtc >= sinceUtc.Value || p.Status == PostStatus.Scheduled);
        }

        return await query
            .Select(p => new Syncra.Domain.Models.Analytics.AnalyticsPostData(
                p.Id,
                p.Status,
                p.PublishedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Syncra.Domain.Models.Analytics.PostExportData>> GetPublishedPostsForExportAsync(
        Guid workspaceId,
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(p => p.Integration)
            .Where(p => p.WorkspaceId == workspaceId
                     && p.Status == PostStatus.Published
                     && p.PublishedAtUtc.HasValue
                     && p.PublishedAtUtc.Value >= startUtc
                     && p.PublishedAtUtc.Value <= endUtc)
            .OrderByDescending(p => p.PublishedAtUtc)
            .Select(p => new Syncra.Domain.Models.Analytics.PostExportData(
                p.Id,
                p.Title.Value.Substring(0, Math.Min(p.Title.Value.Length, 100)),
                p.Content.Value != null
                    ? p.Content.Value.Substring(0, Math.Min(p.Content.Value.Length, 150))
                    : null,
                p.PublishedAtUtc!.Value,
                p.Integration != null ? p.Integration.Platform : "unknown",
                p.Status.ToString()))
            .ToListAsync(cancellationToken);
    }
}
