namespace Syncra.Domain.Entities;

public sealed class UserProfile : EntityBase
{
    public Guid UserId { get; set; }
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Timezone { get; set; }
    public string? Locale { get; set; }

    public User User { get; set; } = null!;
}
