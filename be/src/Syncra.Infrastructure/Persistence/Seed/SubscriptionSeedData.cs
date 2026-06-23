using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Infrastructure.Persistence.Seed;

public static class SubscriptionSeedData
{
    // Workspace IDs from WorkspaceSeedData
    private static readonly Guid Workspace1Id = Guid.Parse("00000000-0000-0000-0000-000000000100");
    private static readonly Guid Workspace2Id = Guid.Parse("00000000-0000-0000-0000-000000000200");
    private static readonly Guid Workspace3Id = Guid.Parse("00000000-0000-0000-0000-000000000300");
    private static readonly Guid Workspace4Id = Guid.Parse("00000000-0000-0000-0000-000000000400");
    private static readonly Guid Workspace5Id = Guid.Parse("00000000-0000-0000-0000-000000000500");
    private static readonly Guid Workspace6Id = Guid.Parse("00000000-0000-0000-0000-000000000600");

    // Plan IDs from PlanSeedData
    private static readonly Guid FreePlanId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid ProPlanId = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid TeamPlanId = Guid.Parse("00000000-0000-0000-0000-000000000003");

    public static void Seed(ModelBuilder modelBuilder)
    {
        var now = DateTime.UtcNow;

        modelBuilder.Entity<Subscription>().HasData(
            // Workspace 1 - Team Plan (Active)
            new Subscription
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000001001"),
                WorkspaceId = Workspace1Id,
                PlanId = TeamPlanId,
                Provider = "stripe",
                ProviderCustomerId = "cus_workspace1",
                ProviderSubscriptionId = "sub_workspace1_team",
                Status = SubscriptionStatus.Active,
                StartsAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = null,
                TrialEndsAtUtc = null,
                CanceledAtUtc = null,
                LastEventTimestampUtc = now,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = now,
                Version = 1
            },
            // Workspace 2 - Pro Plan (Active)
            new Subscription
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000001002"),
                WorkspaceId = Workspace2Id,
                PlanId = ProPlanId,
                Provider = "stripe",
                ProviderCustomerId = "cus_workspace2",
                ProviderSubscriptionId = "sub_workspace2_pro",
                Status = SubscriptionStatus.Active,
                StartsAtUtc = new DateTime(2024, 2, 1, 0, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = null,
                TrialEndsAtUtc = null,
                CanceledAtUtc = null,
                LastEventTimestampUtc = now,
                CreatedAtUtc = new DateTime(2024, 2, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = now,
                Version = 1
            },
            // Workspace 3 - Pro Plan (Active)
            new Subscription
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000001003"),
                WorkspaceId = Workspace3Id,
                PlanId = ProPlanId,
                Provider = "stripe",
                ProviderCustomerId = "cus_workspace3",
                ProviderSubscriptionId = "sub_workspace3_pro",
                Status = SubscriptionStatus.Active,
                StartsAtUtc = new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = null,
                TrialEndsAtUtc = null,
                CanceledAtUtc = null,
                LastEventTimestampUtc = now,
                CreatedAtUtc = new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = now,
                Version = 1
            },
            // Workspace 4 - Free Plan (Active)
            new Subscription
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000001004"),
                WorkspaceId = Workspace4Id,
                PlanId = FreePlanId,
                Provider = null,
                ProviderCustomerId = null,
                ProviderSubscriptionId = null,
                Status = SubscriptionStatus.Active,
                StartsAtUtc = new DateTime(2024, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = null,
                TrialEndsAtUtc = null,
                CanceledAtUtc = null,
                LastEventTimestampUtc = now,
                CreatedAtUtc = new DateTime(2024, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = now,
                Version = 1
            },
            // Workspace 5 - Pro Plan (Trial)
            new Subscription
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000001005"),
                WorkspaceId = Workspace5Id,
                PlanId = ProPlanId,
                Provider = "stripe",
                ProviderCustomerId = "cus_workspace5",
                ProviderSubscriptionId = "sub_workspace5_pro_trial",
                Status = SubscriptionStatus.Active,
                StartsAtUtc = new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = null,
                TrialEndsAtUtc = now.AddDays(14),
                CanceledAtUtc = null,
                LastEventTimestampUtc = now,
                CreatedAtUtc = new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = now,
                Version = 1
            },
            // Workspace 6 - Free Plan (Active)
            new Subscription
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000001006"),
                WorkspaceId = Workspace6Id,
                PlanId = FreePlanId,
                Provider = null,
                ProviderCustomerId = null,
                ProviderSubscriptionId = null,
                Status = SubscriptionStatus.Active,
                StartsAtUtc = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = null,
                TrialEndsAtUtc = null,
                CanceledAtUtc = null,
                LastEventTimestampUtc = now,
                CreatedAtUtc = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = now,
                Version = 1
            }
        );
    }

    public static string GetInsertSubscriptionSql(DateTime now)
    {
        return $@"
            INSERT INTO ""subscriptions"" (""id"", ""workspace_id"", ""plan_id"", ""provider"", ""provider_customer_id"", ""provider_subscription_id"", ""status"", ""starts_at_utc"", ""ends_at_utc"", ""trial_ends_at_utc"", ""canceled_at_utc"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            ('{Guid.Parse("00000000-0000-0000-0000-000000001001")}', '{Workspace1Id}', '{TeamPlanId}', 'stripe', 'cus_workspace1', 'sub_workspace1_team', 'Active', '{new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc):O}', NULL, NULL, '{new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now:O}', 1),
            ('{Guid.Parse("00000000-0000-0000-0000-000000001002")}', '{Workspace2Id}', '{ProPlanId}', 'stripe', 'cus_workspace2', 'sub_workspace2_pro', 'Active', '{new DateTime(2024, 2, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc):O}', NULL, NULL, '{new DateTime(2024, 2, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now:O}', 1),
            ('{Guid.Parse("00000000-0000-0000-0000-000000001003")}', '{Workspace3Id}', '{ProPlanId}', 'stripe', 'cus_workspace3', 'sub_workspace3_pro', 'Active', '{new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc):O}', NULL, NULL, '{new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now:O}', 1),
            ('{Guid.Parse("00000000-0000-0000-0000-000000001004")}', '{Workspace4Id}', '{FreePlanId}', NULL, NULL, NULL, 'Active', '{new DateTime(2024, 4, 1, 0, 0, 0, DateTimeKind.Utc):O}', NULL, NULL, NULL, '{new DateTime(2024, 4, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now:O}', 1),
            ('{Guid.Parse("00000000-0000-0000-0000-000000001005")}', '{Workspace5Id}', '{ProPlanId}', 'stripe', 'cus_workspace5', 'sub_workspace5_pro_trial', 'Active', '{new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{new DateTime(2025, 5, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now.AddDays(14):O}', NULL, '{new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now:O}', 1),
            ('{Guid.Parse("00000000-0000-0000-0000-000000001006")}', '{Workspace6Id}', '{FreePlanId}', NULL, NULL, NULL, 'Active', '{new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc):O}', NULL, NULL, NULL, '{new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc):O}', '{now:O}', 1);
        ";
    }
}
