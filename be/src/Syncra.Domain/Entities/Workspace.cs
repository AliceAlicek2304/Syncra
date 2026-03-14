namespace Syncra.Domain.Entities;

public sealed class Workspace : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid OwnerUserId { get; set; }
    public string? StripeCustomerId { get; set; }

    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
    public ICollection<UsageCounter> UsageCounters { get; set; } = new List<UsageCounter>();
    public Subscription? Subscription { get; set; }
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<Integration> Integrations { get; set; } = new List<Integration>();
}
