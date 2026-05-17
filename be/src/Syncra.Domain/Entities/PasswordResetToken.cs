namespace Syncra.Domain.Entities;

public sealed class PasswordResetToken : EntityBase
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }

    public User User { get; set; } = null!;

    // Computed properties
    public bool IsExpired => DateTime.UtcNow > ExpiresAtUtc;
    public bool IsUsed => UsedAtUtc.HasValue;
    public bool IsValid => !IsExpired && !IsUsed;

    // Domain behaviors
    public void MarkAsUsed()
    {
        if (UsedAtUtc.HasValue)
        {
            return;
        }

        UsedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
