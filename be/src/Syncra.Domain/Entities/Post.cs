namespace Syncra.Domain.Entities;

public sealed class Post : WorkspaceEntityBase
{
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime? ScheduledAtUtc { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public string Status { get; set; } = "Draft";

    public Workspace Workspace { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<Media> Media { get; set; } = new List<Media>();
}
