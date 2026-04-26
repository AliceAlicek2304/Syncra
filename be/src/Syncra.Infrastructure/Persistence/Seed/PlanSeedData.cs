using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Seed;

public static class PlanSeedData
{
    public static void Seed(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Plan>().HasData(
            new Plan
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Code = "FREE",
                Name = "Free Plan",
                Description = "Basic features for individuals",
                PriceMonthly = 0,
                PriceYearly = 0,
                MaxMembers = 1,
                MaxSocialAccounts = 3,
                MaxScheduledPostsPerMonth = 10,
                StripeProductId = "prod_placeholder_free",
                StripePriceId = "price_placeholder_free",
                IsActive = true,
                SortOrder = 1,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            },
            new Plan
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                Code = "PRO",
                Name = "Pro Plan",
                Description = "Professional features for content creators",
                PriceMonthly = 19.99m,
                PriceYearly = 199.99m,
                MaxMembers = 3,
                MaxSocialAccounts = 10,
                MaxScheduledPostsPerMonth = 100,
                StripeProductId = "prod_placeholder_pro",
                StripePriceId = "price_placeholder_pro",
                IsActive = true,
                SortOrder = 2,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            },
            new Plan
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Code = "TEAM",
                Name = "Team Plan",
                Description = "Advanced features for teams and agencies",
                PriceMonthly = 49.99m,
                PriceYearly = 499.99m,
                MaxMembers = 10,
                MaxSocialAccounts = 30,
                MaxScheduledPostsPerMonth = 1000,
                StripeProductId = "prod_placeholder_team",
                StripePriceId = "price_placeholder_team",
                IsActive = true,
                SortOrder = 3,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            }
        );
    }
}
