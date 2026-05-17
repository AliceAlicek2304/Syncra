namespace Syncra.Domain.Entities;

public sealed class EmailVerificationToken : EntityBase
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }

    // Navigation property
    public User User { get; set; } = null!;

    // Domain behavior methods
    public bool IsExpired => DateTime.UtcNow > ExpiresAtUtc;
    public bool IsUsed => UsedAtUtc.HasValue;
    public bool IsValid => !IsExpired && !IsUsed;

    public void MarkAsUsed()
    {
        UsedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
