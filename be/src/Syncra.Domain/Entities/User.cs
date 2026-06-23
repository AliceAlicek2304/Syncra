using Syncra.Domain.Enums;
using Syncra.Domain.ValueObjects;

namespace Syncra.Domain.Entities;

public sealed class User : EntityBase
{
    // Value Objects
    public Email Email { get; private set; } = null!;
    public string NormalizedEmail { get; private set; } = string.Empty;

    // Primitive properties
    public string PasswordHash { get; private set; } = string.Empty;
    public string Status { get; private set; } = "active";
    public DateTime? EmailVerifiedAtUtc { get; private set; }
    public DateTime? LastLoginAtUtc { get; private set; }
    public string? StudentEmail { get; private set; }
    public DateTime? StudentEmailVerifiedAtUtc { get; private set; }
    public DateTime? StudentVerificationExpiresAtUtc { get; private set; }
    public bool HasPasswordBeenSet { get; private set; } = true;
    private string _securityStamp = Guid.NewGuid().ToString();
    public string SecurityStamp
    {
        get => string.IsNullOrWhiteSpace(_securityStamp) ? (_securityStamp = Guid.NewGuid().ToString()) : _securityStamp;
        private set => _securityStamp = value;
    }

    // Navigation properties
    public UserProfile? Profile { get; set; }
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; } = new List<WorkspaceMember>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();

    // Private parameterless constructor for EF Core
    private User() { }

    // Factory method
    public static User Create(string email, string passwordHash)
    {
        var now = DateTime.UtcNow;

        return new User
        {
            Email = Email.Create(email),
            NormalizedEmail = Email.Create(email).Value.ToUpperInvariant(),
            PasswordHash = passwordHash,
            Status = "active",
            SecurityStamp = Guid.NewGuid().ToString(),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors

    public bool IsActive => Status == "active";
    public bool IsPending => Status == "pending";
    public bool IsSuspended => Status == "suspended";
    public bool IsDeleted => Status == "deleted";

    public bool IsEmailVerified => EmailVerifiedAtUtc.HasValue;
    public bool HasValidStudentVerification =>
        StudentEmailVerifiedAtUtc.HasValue &&
        StudentVerificationExpiresAtUtc.HasValue &&
        StudentVerificationExpiresAtUtc.Value > DateTime.UtcNow;

    public void VerifyEmail()
    {
        if (IsEmailVerified)
        {
            return;
        }

        EmailVerifiedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void VerifyStudentEmail(string studentEmail, DateTime verifiedAtUtc)
    {
        StudentEmail = Email.Create(studentEmail).Value;
        StudentEmailVerifiedAtUtc = verifiedAtUtc;
        StudentVerificationExpiresAtUtc = verifiedAtUtc.AddYears(1);
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void ClearStudentVerification()
    {
        StudentEmail = null;
        StudentEmailVerifiedAtUtc = null;
        StudentVerificationExpiresAtUtc = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void RecordLogin()
    {
        LastLoginAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdatePassword(string newPasswordHash)
    {
        PasswordHash = newPasswordHash;
        HasPasswordBeenSet = true;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkPasswordAsNotSet()
    {
        HasPasswordBeenSet = false;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void RegenerateSecurityStamp() => SecurityStamp = Guid.NewGuid().ToString();

    public void UpdateEmail(string newEmail)
    {
        if (IsDeleted)
        {
            throw new InvalidOperationException("Cannot update email of a deleted user.");
        }

        Email = Email.Create(newEmail);
        NormalizedEmail = Email.Value.ToUpperInvariant();
        EmailVerifiedAtUtc = null; // Require re-verification
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Suspend(string reason)
    {
        if (IsSuspended)
        {
            return;
        }

        Status = "suspended";
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Reactivate()
    {
        if (!IsSuspended)
        {
            return;
        }

        Status = "active";
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkAsDeleted()
    {
        Status = "deleted";
        EmailVerifiedAtUtc = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool CanAccessWorkspace(Guid workspaceId)
    {
        return WorkspaceMemberships.Any(m =>
            m.WorkspaceId == workspaceId &&
            m.Status == WorkspaceMemberStatus.Active);
    }
}
