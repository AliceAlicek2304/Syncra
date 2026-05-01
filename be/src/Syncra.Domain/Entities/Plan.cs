namespace Syncra.Domain.Entities;

public sealed class Plan : EntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal PriceMonthly { get; set; }
    public decimal PriceYearly { get; set; }
    public int MaxMembers { get; set; }
    public int MaxSocialAccounts { get; set; }
    public int MaxScheduledPostsPerMonth { get; set; }
    public string? StripeProductId { get; set; }
    public string? StripeMonthlyPriceId { get; set; }
    public string? StripeYearlyPriceId { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public DateTime? LastEventTimestampUtc { get; set; }
}
