namespace Syncra.Domain.Entities;

public sealed class Group : WorkspaceEntityBase
{
    public const int NameMaxLength = 50;

    public string Name { get; private set; } = string.Empty;

    public Workspace Workspace { get; set; } = null!;

    private Group() { }

    public static Group Create(Guid workspaceId, string name)
    {
        var now = DateTime.UtcNow;

        var trimmedName = name.Trim();
        if (trimmedName.Length > NameMaxLength)
        {
            trimmedName = trimmedName[..NameMaxLength];
        }

        return new Group
        {
            WorkspaceId = workspaceId,
            Name = trimmedName,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void Update(string name)
    {
        var trimmedName = name.Trim();
        if (trimmedName.Length > NameMaxLength)
        {
            trimmedName = trimmedName[..NameMaxLength];
        }

        Name = trimmedName;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
