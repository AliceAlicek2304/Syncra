namespace Syncra.Application.DTOs;

/// <summary>
/// Represents the current subscription state for a workspace.
/// This DTO is stable even when no subscription exists - returns a default "Free" state.
/// </summary>
public class CurrentSubscriptionDto
{
    /// <summary>
    /// The subscription status. Common values: None, Free, Active, Trialing, Canceled, PastDue, Unpaid, Expired.
    /// </summary>
    public string Status { get; set; } = "None";

    /// <summary>
    /// The plan code (e.g., "free", "starter", "pro", "enterprise").
    /// Null if no plan is associated.
    /// </summary>
    public string? PlanCode { get; set; }

    /// <summary>
    /// The human-readable plan name.
    /// </summary>
    public string? PlanName { get; set; }

    /// <summary>
    /// When the subscription started (UTC).
    /// </summary>
    public DateTime? StartedAtUtc { get; set; }

    /// <summary>
    /// When the subscription ends (UTC). Null for open-ended subscriptions.
    /// </summary>
    public DateTime? EndsAtUtc { get; set; }

    /// <summary>
    /// When the trial period ends (UTC). Null if not trialing or trial has ended.
    /// </summary>
    public DateTime? TrialEndsAtUtc { get; set; }

    /// <summary>
    /// When the subscription was canceled (UTC). Null if not canceled.
    /// </summary>
    public DateTime? CanceledAtUtc { get; set; }

    /// <summary>
    /// The billing provider (e.g., "stripe"). Null for default/free subscriptions.
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// The provider's customer identifier. Null for default/free subscriptions.
    /// </summary>
    public string? ProviderCustomerId { get; set; }

    /// <summary>
    /// The provider's subscription identifier. Null for default/free subscriptions.
    /// </summary>
    public string? ProviderSubscriptionId { get; set; }

    /// <summary>
    /// Indicates whether this is a default/free subscription (no actual subscription row exists).
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Creates a default DTO representing a workspace with no subscription.
    /// Returns a "Free" state suitable for UI and demo flows.
    /// </summary>
    public static CurrentSubscriptionDto Default(Guid workspaceId)
    {
        return new CurrentSubscriptionDto
        {
            Status = "Free",
            PlanCode = "free",
            PlanName = "Free",
            IsDefault = true
        };
    }
}
