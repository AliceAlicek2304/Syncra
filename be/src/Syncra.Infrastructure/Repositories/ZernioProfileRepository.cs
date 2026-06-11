using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class ZernioProfileRepository : Repository<ZernioProfile>, IZernioProfileRepository
{
    public ZernioProfileRepository(AppDbContext context) : base(context)
    {
    }

    public new async Task<ZernioProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public Task<ZernioProfile?> GetByWorkspaceIdAsync(Guid workspaceId)
    {
        return _dbSet.FirstOrDefaultAsync(profile => profile.WorkspaceId == workspaceId);
    }

    public async Task<IReadOnlyList<ZernioProfile>> GetByWorkspaceIdsAsync(IReadOnlyCollection<Guid> workspaceIds)
    {
        return await _dbSet
            .Where(p => workspaceIds.Contains(p.WorkspaceId))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<ZernioProfile>> GetActiveByWorkspaceIdAsync(Guid workspaceId)
    {
        return await _dbSet
            .Where(p => p.WorkspaceId == workspaceId && p.IsActive)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<ZernioProfile>> GetAllActiveAsync()
    {
        return await _dbSet
            .Where(p => p.IsActive)
            .ToListAsync();
    }
}
