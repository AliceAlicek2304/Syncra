namespace Syncra.Domain.Entities;

public sealed class BillingVoucher : EntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DiscountType { get; set; } = "percent";
    public decimal? PercentOff { get; set; }
    public decimal? AmountOff { get; set; }
    public string Currency { get; set; } = "VND";
    public decimal? MinimumAmount { get; set; }
    public string? ApplicablePlanCodesJson { get; set; }
    public string? ApplicableIntervalsJson { get; set; }
    public int? MaxRedemptions { get; set; }
    public int? MaxRedemptionsPerUser { get; set; }
    public int RedeemedCount { get; set; }
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public bool RequiresStudentVerification { get; set; }
    public string Source { get; set; } = "manual";
}
