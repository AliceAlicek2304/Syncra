using Microsoft.EntityFrameworkCore;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class MediaRepository : Repository<Media>, IMediaRepository
{
    public MediaRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<(IEnumerable<Media> Items, int TotalCount)> GetByWorkspaceIdAsync(
        Guid workspaceId,
        string? mediaType = null,
        bool? isAttached = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.Where(m => m.WorkspaceId == workspaceId);

        if (!string.IsNullOrEmpty(mediaType))
        {
            query = query.Where(m => m.MediaType == mediaType);
        }

        if (isAttached.HasValue)
        {
            query = isAttached.Value 
                ? query.Where(m => m.PostId != null) 
                : query.Where(m => m.PostId == null);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(m => m.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
