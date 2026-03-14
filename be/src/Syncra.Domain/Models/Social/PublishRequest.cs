namespace Syncra.Domain.Models.Social;

public class PublishRequest
{
    public Guid WorkspaceId { get; set; }
    public Guid PostId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime? ScheduledAtUtc { get; set; }
    public IReadOnlyList<Guid> MediaIds { get; set; } = Array.Empty<Guid>();
    public Dictionary<string, string> Metadata { get; set; } = new();
}

