using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class Subscription : WorkspaceEntityBase
{
    public Guid PlanId { get; set; }
    public string? Provider { get; set; }
    public string? ProviderCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string? ProviderSubscriptionId { get; set; }
    public SubscriptionStatus Status { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
    public DateTime? TrialEndsAtUtc { get; set; }
    public DateTime? CanceledAtUtc { get; set; }

    public Workspace Workspace { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
}
