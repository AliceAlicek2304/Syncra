using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface ISubscriptionRepository
{
    Task<Subscription?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Subscription>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Subscription entity);
    Task UpdateAsync(Subscription entity);
    Task DeleteAsync(Guid id);
    Task<Subscription?> GetCurrentForWorkspaceAsync(Guid workspaceId);
    Task<Subscription?> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<Subscription?> GetByProviderSubscriptionIdAsync(string provider, string providerSubscriptionId);
}
