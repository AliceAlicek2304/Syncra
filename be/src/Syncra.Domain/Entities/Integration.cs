namespace Syncra.Domain.Entities;

public sealed class Integration : WorkspaceEntityBase
{
    public string Platform { get; set; } = string.Empty;
    public string? ExternalAccountId { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Metadata { get; set; }

    public Workspace Workspace { get; set; } = null!;
}
