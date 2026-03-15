using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class IdeaRepository : Repository<Idea>, IIdeaRepository
{
    public IdeaRepository(AppDbContext context) : base(context)
    {
    }

    public override async Task<Idea?> GetByIdAsync(Guid id)
    {
        return await _dbSet
            .Include(i => i.Workspace)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<Idea?> GetByIdAsync(Guid id, Guid workspaceId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(i => i.Id == id && i.WorkspaceId == workspaceId);
    }

    public async Task<IReadOnlyList<Idea>> GetByIdsAsync(IReadOnlyCollection<Guid> ids)
    {
        return await _dbSet
            .Where(i => ids.Contains(i.Id))
            .ToListAsync();
    }

    public async Task<IEnumerable<Idea>> GetByWorkspaceIdAsync(Guid workspaceId)
    {
        return await _dbSet
            .Where(i => i.WorkspaceId == workspaceId)
            .OrderByDescending(i => i.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<(IReadOnlyList<Idea> Items, int TotalCount)> GetFilteredAsync(
        Guid workspaceId,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet
            .Where(i => i.WorkspaceId == workspaceId)
            .AsQueryable();

        // Apply status filter
        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(i => i.Status == status);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var result = await query
            .OrderByDescending(i => i.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (result, totalCount);
    }
}