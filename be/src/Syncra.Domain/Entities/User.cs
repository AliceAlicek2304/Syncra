namespace Syncra.Domain.Entities;

public sealed class User : EntityBase
{
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTime? EmailVerifiedAtUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }

    public UserProfile? Profile { get; set; }
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; } = new List<WorkspaceMember>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}
