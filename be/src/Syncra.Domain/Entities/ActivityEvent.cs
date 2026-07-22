namespace Syncra.Domain.Entities;

public sealed class ActivityEvent : EntityBase
{
    public Guid? WorkspaceId { get; set; }
    public Guid? UserId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string EventGroup { get; set; } = string.Empty;
    public string Status { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? SubjectType { get; set; }
    public string? SubjectId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
