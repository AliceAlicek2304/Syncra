using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
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

    public async Task<IReadOnlyList<Integration>> GetByWorkspaceAndPlatformAllAsync(Guid workspaceId, string platform)
    {
        var normalizedPlatform = platform.ToLowerInvariant();

        return await _dbSet
            .Where(i => i.WorkspaceId == workspaceId && i.Platform == normalizedPlatform)
            .OrderByDescending(i => i.IsActive)
            .ThenByDescending(i => i.UpdatedAtUtc ?? i.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<Integration?> GetByWorkspaceAndPlatformAsync(Guid workspaceId, string platform)
    {
        var normalizedPlatform = platform.ToLowerInvariant();

        return await _dbSet
            .Where(i => i.WorkspaceId == workspaceId && i.Platform == normalizedPlatform)
            .OrderByDescending(i => i.IsActive)
            .ThenByDescending(i => i.UpdatedAtUtc ?? i.CreatedAtUtc)
            .FirstOrDefaultAsync();
    }

    public async Task<Integration?> GetByWorkspacePlatformAndExternalAccountIdAsync(Guid workspaceId, string platform, string externalAccountId)
    {
        var normalizedPlatform = platform.ToLowerInvariant();

        return await _dbSet
            .Where(i => i.WorkspaceId == workspaceId
                        && i.Platform == normalizedPlatform
                        && i.ExternalAccountId == externalAccountId)
            .OrderByDescending(i => i.IsActive)
            .ThenByDescending(i => i.UpdatedAtUtc ?? i.CreatedAtUtc)
            .FirstOrDefaultAsync();
    }

    public async Task<IReadOnlyList<Integration>> GetAllAsync()
    {
        return await _dbSet.ToListAsync();
    }
}
