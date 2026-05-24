namespace Syncra.Domain.Entities;

public sealed class SocialAccount : WorkspaceEntityBase
{
    public const int ExternalAccountIdMaxLength = 200;
    public const int PlatformMaxLength = 50;
    public const int DisplayNameMaxLength = 200;
    public const int AvatarUrlMaxLength = 2048;

    public string ExternalAccountId { get; private set; } = string.Empty;
    public string Platform { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public string? AvatarUrl { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? ConnectedAtUtc { get; private set; }

    public Guid ZernioProfileId { get; private set; }
    public ZernioProfile ZernioProfile { get; set; } = null!;
    public Workspace Workspace { get; set; } = null!;

    private SocialAccount() { }

    public static SocialAccount Create(
        Guid workspaceId,
        Guid zernioProfileId,
        string externalAccountId,
        string platform,
        string displayName,
        string? avatarUrl = null)
    {
        var now = DateTime.UtcNow;

        return new SocialAccount
        {
            WorkspaceId = workspaceId,
            ZernioProfileId = zernioProfileId,
            ExternalAccountId = externalAccountId,
            Platform = platform.ToLowerInvariant(),
            DisplayName = displayName,
            AvatarUrl = avatarUrl,
            IsActive = true,
            ConnectedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void Update(string displayName, string? avatarUrl)
    {
        DisplayName = displayName;
        AvatarUrl = avatarUrl;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        if (!IsActive) return;

        IsActive = false;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Reactivate()
    {
        if (IsActive) return;

        IsActive = true;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
