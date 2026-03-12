using Microsoft.EntityFrameworkCore;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class SubscriptionRepository : Repository<Subscription>, ISubscriptionRepository
{
    public SubscriptionRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Subscription?> GetCurrentForWorkspaceAsync(Guid workspaceId)
    {
        var subscriptions = await _dbSet
            .Include(s => s.Plan)
            .Where(s => s.WorkspaceId == workspaceId)
            .OrderByDescending(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trialing)
            .ThenByDescending(s => s.StartsAtUtc)
            .ToListAsync();

        return subscriptions.FirstOrDefault();
    }
}
