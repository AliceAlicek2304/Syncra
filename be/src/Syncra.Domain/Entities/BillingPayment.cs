namespace Syncra.Domain.Entities;

public sealed class BillingPayment : WorkspaceEntityBase
{
    public Guid? SubscriptionId { get; set; }
    public Guid PlanId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ProviderPaymentId { get; set; } = string.Empty;
    public string? ProviderSubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public decimal? OriginalAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Interval { get; set; } = "month";
    public string? DiscountCode { get; set; }
    public decimal? DiscountPercentOff { get; set; }
    public DateTime PaidAtUtc { get; set; }

    public Plan Plan { get; set; } = null!;
    public Subscription? Subscription { get; set; }
}
