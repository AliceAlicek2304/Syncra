using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface ISubscriptionRepository : IRepository<Subscription>
{
    /// <summary>
    /// Gets the current subscription for a workspace.
    /// Selection logic:
    /// - Prefers Active or Trialing subscriptions
    /// - Falls back to most recent by StartsAtUtc if no active/trialing
    /// - Returns null if no subscription exists for the workspace
    /// </summary>
    Task<Subscription?> GetCurrentForWorkspaceAsync(Guid workspaceId);
    Task<Subscription> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<Subscription> GetByStripeSubscriptionIdAsync(string stripeSubscriptionId);
}
