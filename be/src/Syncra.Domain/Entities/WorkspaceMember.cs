using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;

namespace Syncra.Domain.Entities;

public sealed class WorkspaceMember : WorkspaceEntityBase
{
    // Properties with private setters
    public Guid UserId { get; private set; }
    public WorkspaceMemberRole Role { get; private set; }
    public WorkspaceMemberStatus Status { get; private set; }
    public Guid? InvitedByUserId { get; private set; }
    public DateTime? JoinedAtUtc { get; private set; }

    // Navigation properties
    public Workspace Workspace { get; set; } = null!;
    public User User { get; set; } = null!;

    // Private parameterless constructor for EF Core
    private WorkspaceMember() { }

    // Factory method
    public static WorkspaceMember Create(
        Guid workspaceId,
        Guid userId,
        string role,
        Guid? invitedByUserId = null)
    {
        var now = DateTime.UtcNow;

        if (!Enum.TryParse<WorkspaceMemberRole>(role, true, out var memberRole))
        {
            memberRole = WorkspaceMemberRole.Member;
        }

        return new WorkspaceMember
        {
            WorkspaceId = workspaceId,
            UserId = userId,
            Role = memberRole,
            Status = WorkspaceMemberStatus.Pending,
            InvitedByUserId = invitedByUserId,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors

    public bool IsActive => Status == WorkspaceMemberStatus.Active;
    public bool IsPending => Status == WorkspaceMemberStatus.Pending;
    public bool IsRemoved => Status == WorkspaceMemberStatus.Inactive;

    public bool CanBeActivated() =>
        Status == WorkspaceMemberStatus.Pending;

    public void Activate()
    {
        if (!CanBeActivated())
        {
            throw new DomainException(
                "invalid_state",
                "Only pending members can be activated.");
        }

        Status = WorkspaceMemberStatus.Active;
        JoinedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool CanBeRemoved() =>
        Role != WorkspaceMemberRole.Owner && Status != WorkspaceMemberStatus.Inactive;

    public void MarkAsDeleted()
    {
        if (!CanBeRemoved())
        {
            throw new DomainException(
                "invalid_operation",
                "Cannot remove the owner or already removed members.");
        }

        Status = WorkspaceMemberStatus.Inactive;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool CanChangeRole() =>
        Role != WorkspaceMemberRole.Owner;

    public void ChangeRole(string newRole)
    {
        if (!CanChangeRole())
        {
            throw new DomainException(
                "invalid_operation",
                "Cannot change the owner's role.");
        }

        if (!Enum.TryParse<WorkspaceMemberRole>(newRole, true, out var role))
        {
            throw new DomainException(
                "invalid_role",
                $"Invalid role: {newRole}");
        }

        Role = role;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
