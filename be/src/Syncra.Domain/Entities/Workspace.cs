using Syncra.Domain.Enums;
using Syncra.Domain.ValueObjects;

namespace Syncra.Domain.Entities;

public sealed class Workspace : EntityBase
{
    // Value Objects
    public WorkspaceName Name { get; private set; } = null!;
    public WorkspaceSlug Slug { get; private set; } = null!;

    // Primitive properties
    public Guid OwnerUserId { get; private set; }
    public string? StripeCustomerId { get; private set; }

    // Navigation properties
    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
    public ICollection<UsageCounter> UsageCounters { get; set; } = new List<UsageCounter>();
    public Subscription? Subscription { get; set; }
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<Integration> Integrations { get; set; } = new List<Integration>();
    public ICollection<Idea> Ideas { get; set; } = new List<Idea>();
    public ICollection<Group> Groups { get; set; } = new List<Group>();

    // Private parameterless constructor for EF Core
    private Workspace() { }

    // Factory method
    public static Workspace Create(Guid ownerUserId, string name, string slug)
    {
        var now = DateTime.UtcNow;

        return new Workspace
        {
            OwnerUserId = ownerUserId,
            Name = WorkspaceName.Create(name),
            Slug = WorkspaceSlug.Create(slug),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors

    public bool HasSubscription => Subscription != null;
    public bool HasActiveSubscription => Subscription?.Status == SubscriptionStatus.Active;

    public void Rename(string newName)
    {
        Name = WorkspaceName.Create(newName);
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateSlug(string newSlug)
    {
        Slug = WorkspaceSlug.Create(newSlug);
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void SetStripeCustomerId(string customerId)
    {
        StripeCustomerId = customerId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void AddMember(Guid userId, string role)
    {
        if (Members.Any(m => m.UserId == userId))
        {
            throw new InvalidOperationException("User is already a member of this workspace.");
        }

        var member = WorkspaceMember.Create(Id, userId, role);
        Members.Add(member);
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void RemoveMember(Guid userId)
    {
        var member = Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null)
        {
            throw new InvalidOperationException("User is not a member of this workspace.");
        }

        if (member.Role == WorkspaceMemberRole.Owner)
        {
            throw new InvalidOperationException("Cannot remove the owner from the workspace.");
        }

        member.MarkAsDeleted();
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool IsOwner(Guid userId) => OwnerUserId == userId;

    public bool HasMember(Guid userId) =>
        Members.Any(m => m.UserId == userId && m.Status == WorkspaceMemberStatus.Active);

    public WorkspaceMember? GetMember(Guid userId) =>
        Members.FirstOrDefault(m => m.UserId == userId);

    public int GetUsageCount(string metricCode)
    {
        var counter = UsageCounters.FirstOrDefault(c => c.MetricCode == metricCode);
        return (int)(counter?.Value ?? 0);
    }

    public void IncrementUsage(string metricCode, int amount = 1)
    {
        var counter = UsageCounters.FirstOrDefault(c => c.MetricCode == metricCode);
        if (counter == null)
        {
            var now = DateTime.UtcNow;
            counter = new UsageCounter
            {
                WorkspaceId = Id,
                MetricCode = metricCode,
                Value = 0,
                PeriodStartUtc = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                PeriodEndUtc = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1)
            };
            UsageCounters.Add(counter);
        }

        counter.Value += amount;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void ResetUsage(string metricCode)
    {
        var counter = UsageCounters.FirstOrDefault(c => c.MetricCode == metricCode);
        if (counter != null)
        {
            counter.Value = 0;
            UpdatedAtUtc = DateTime.UtcNow;
        }
    }

    public int GetActiveIntegrationCount() =>
        Integrations.Count(i => i.IsActive);

    public bool HasIntegration(Guid integrationId) =>
        Integrations.Any(i => i.Id == integrationId && i.IsActive);
}
