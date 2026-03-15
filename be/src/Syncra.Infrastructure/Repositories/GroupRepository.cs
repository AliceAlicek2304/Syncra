using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class GroupRepository : Repository<Group>, IGroupRepository
{
    public GroupRepository(AppDbContext context) : base(context)
    {
    }

    public override async Task<Group?> GetByIdAsync(Guid id)
    {
        return await _dbSet
            .Include(g => g.Workspace)
            .FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<Group?> GetByIdAsync(Guid id, Guid workspaceId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(g => g.Id == id && g.WorkspaceId == workspaceId);
    }

    public async Task<IReadOnlyList<Group>> GetByIdsAsync(IReadOnlyCollection<Guid> ids)
    {
        return await _dbSet
            .Where(g => ids.Contains(g.Id))
            .ToListAsync();
    }

    public async Task<IEnumerable<Group>> GetByWorkspaceIdAsync(Guid workspaceId)
    {
        return await _dbSet
            .Where(g => g.WorkspaceId == workspaceId)
            .OrderByDescending(g => g.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<bool> ExistsWithNameAsync(Guid workspaceId, string name, Guid? excludeId = null)
    {
        var trimmedName = name.Trim();
        var query = _dbSet.Where(g => g.WorkspaceId == workspaceId && g.Name == trimmedName);
        
        if (excludeId.HasValue)
        {
            query = query.Where(g => g.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }
}
