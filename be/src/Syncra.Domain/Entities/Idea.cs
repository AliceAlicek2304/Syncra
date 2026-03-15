namespace Syncra.Domain.Entities;

public sealed class Idea : WorkspaceEntityBase
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 2000;
    public const int StatusMaxLength = 50;

    // Properties with private setters
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string Status { get; private set; } = "unassigned";

    // Navigation property
    public Workspace Workspace { get; set; } = null!;

    // Private parameterless constructor for EF Core
    private Idea() { }

    // Factory method - Create a new idea
    public static Idea Create(
        Guid workspaceId,
        string title,
        string? description = null,
        string status = "unassigned")
    {
        var now = DateTime.UtcNow;

        var trimmedTitle = title.Trim();
        if (trimmedTitle.Length > TitleMaxLength)
        {
            trimmedTitle = trimmedTitle[..TitleMaxLength];
        }

        string? trimmedDescription = null;
        if (!string.IsNullOrWhiteSpace(description))
        {
            trimmedDescription = description.Trim();
            if (trimmedDescription.Length > DescriptionMaxLength)
            {
                trimmedDescription = trimmedDescription[..DescriptionMaxLength];
            }
        }

        var trimmedStatus = status.Trim();
        if (trimmedStatus.Length > StatusMaxLength)
        {
            trimmedStatus = trimmedStatus[..StatusMaxLength];
        }

        return new Idea
        {
            WorkspaceId = workspaceId,
            Title = trimmedTitle,
            Description = trimmedDescription,
            Status = string.IsNullOrEmpty(trimmedStatus) ? "unassigned" : trimmedStatus,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors - mutation methods

    public void Update(string title, string? description, string status)
    {
        var trimmedTitle = title.Trim();
        if (trimmedTitle.Length > TitleMaxLength)
        {
            trimmedTitle = trimmedTitle[..TitleMaxLength];
        }

        string? trimmedDescription = null;
        if (!string.IsNullOrWhiteSpace(description))
        {
            trimmedDescription = description.Trim();
            if (trimmedDescription.Length > DescriptionMaxLength)
            {
                trimmedDescription = trimmedDescription[..DescriptionMaxLength];
            }
        }

        var trimmedStatus = status.Trim();
        if (trimmedStatus.Length > StatusMaxLength)
        {
            trimmedStatus = trimmedStatus[..StatusMaxLength];
        }

        Title = trimmedTitle;
        Description = trimmedDescription;
        Status = string.IsNullOrEmpty(trimmedStatus) ? "unassigned" : trimmedStatus;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateStatus(string status)
    {
        var trimmedStatus = status.Trim();
        if (trimmedStatus.Length > StatusMaxLength)
        {
            trimmedStatus = trimmedStatus[..StatusMaxLength];
        }

        Status = string.IsNullOrEmpty(trimmedStatus) ? "unassigned" : trimmedStatus;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}