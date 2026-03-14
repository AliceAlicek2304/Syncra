using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class AuditLog : EntityBase
{
    public Guid? WorkspaceId { get; set; }
    public Guid? UserId { get; set; }
    public AuditActorType ActorType { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public AuditResult Result { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? CorrelationId { get; set; }
    public string? DetailsJson { get; set; }
}
