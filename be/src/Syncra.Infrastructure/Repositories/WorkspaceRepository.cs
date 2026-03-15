using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class WorkspaceRepository : Repository<Workspace>, IWorkspaceRepository
{
    public WorkspaceRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Workspace?> GetBySlugAsync(string slug)
    {
        return await _dbSet.FirstOrDefaultAsync(o => o.Slug == slug);
    }

    public async Task<Workspace?> GetBySlugWithMembersAsync(string slug)
    {
        return await _dbSet
            .Include(o => o.Members)
            .ThenInclude(om => om.User)
            .FirstOrDefaultAsync(o => o.Slug == slug);
    }

    public async Task<IEnumerable<Workspace>> GetByUserIdAsync(Guid userId)
    {
        return await _context.WorkspaceMembers
            .Where(m => m.UserId == userId)
            .Include(m => m.Workspace)
            .Select(m => m.Workspace)
            .ToListAsync();
    }
}
