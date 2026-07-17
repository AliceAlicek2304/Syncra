using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class ZernioProfile : WorkspaceEntityBase
{
    public const int DisplayNameMaxLength = 200;
    public const int PlatformMaxLength = 50;
    public const int AvatarUrlMaxLength = 2048;

    public string ZernioProfileId { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public string Platform { get; private set; } = string.Empty;
    public string? AvatarUrl { get; private set; }
    public bool IsActive { get; private set; } = true;
    public new string? Metadata { get; private set; }

    public Workspace Workspace { get; set; } = null!;
    public ICollection<SocialAccount> SocialAccounts { get; set; } = new List<SocialAccount>();

    private ZernioProfile() { }

    public static ZernioProfile Create(
        Guid workspaceId,
        string zernioProfileId,
        string displayName,
        string platform,
        string? avatarUrl = null)
    {
        var now = DateTime.UtcNow;

        return new ZernioProfile
        {
            WorkspaceId = workspaceId,
            ZernioProfileId = zernioProfileId,
            DisplayName = displayName,
            Platform = platform.ToLowerInvariant(),
            AvatarUrl = avatarUrl,
            IsActive = true,
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
