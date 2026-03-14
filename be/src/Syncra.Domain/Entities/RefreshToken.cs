namespace Syncra.Domain.Entities;

public sealed class RefreshToken : EntityBase
{
    public Guid UserSessionId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RotatedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public Guid? ReplacedByTokenId { get; set; }

    public UserSession Session { get; set; } = null!;
}
