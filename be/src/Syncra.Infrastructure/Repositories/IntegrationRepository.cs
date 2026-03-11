using Microsoft.EntityFrameworkCore;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class IntegrationRepository : Repository<Integration>, IIntegrationRepository
{
    public IntegrationRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Integration>> GetByWorkspaceIdAsync(Guid workspaceId)
    {
        return await _dbSet
            .Where(i => i.WorkspaceId == workspaceId)
            .ToListAsync();
    }

    public async Task<Integration?> GetByWorkspaceAndPlatformAsync(Guid workspaceId, string platform)
    {
        return await _dbSet
            .FirstOrDefaultAsync(i => i.WorkspaceId == workspaceId && i.Platform == platform);
    }
}
