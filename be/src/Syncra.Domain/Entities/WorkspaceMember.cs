using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class WorkspaceMember : WorkspaceEntityBase
{
    public Guid UserId { get; set; }
    public WorkspaceMemberRole Role { get; set; }
    public WorkspaceMemberStatus Status { get; set; }
    public Guid? InvitedByUserId { get; set; }
    public DateTime? JoinedAtUtc { get; set; }

    public Workspace Workspace { get; set; } = null!;
    public User User { get; set; } = null!;
}
