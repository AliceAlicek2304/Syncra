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

    public Task<ZernioProfile?> GetByWorkspaceIdAsync(Guid workspaceId)
    {
        return _dbSet.FirstOrDefaultAsync(profile => profile.WorkspaceId == workspaceId);
    }
}
