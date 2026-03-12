using Microsoft.EntityFrameworkCore;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class PostRepository : Repository<Post>, IPostRepository
{
    public PostRepository(AppDbContext context) : base(context)
    {
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
                p.Status == PostStatus.Scheduled &&
                p.ScheduledAtUtc <= utcNow)
            .OrderBy(p => p.ScheduledAtUtc)
            .ThenBy(p => p.Id)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
    }
}
