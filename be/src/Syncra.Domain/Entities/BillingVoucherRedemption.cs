namespace Syncra.Domain.Entities;

public sealed class BillingVoucherRedemption : WorkspaceEntityBase
{
    public Guid VoucherId { get; set; }
    public Guid UserId { get; set; }
    public Guid PlanId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Guid? BillingPaymentId { get; set; }
    public string VoucherCode { get; set; } = string.Empty;
    public string Status { get; set; } = "redeemed";
    public string? CheckoutSessionId { get; set; }
    public string? PaymentProvider { get; set; }
    public decimal OriginalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public DateTime RedeemedAtUtc { get; set; } = DateTime.UtcNow;

    public BillingVoucher Voucher { get; set; } = null!;
    public User User { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
    public Subscription? Subscription { get; set; }
    public BillingPayment? BillingPayment { get; set; }
}
