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
                Code = "BASIC",
                Name = "Basic",
                Description = "Perfect for testing the platform.",
                PriceMonthly = 99_000m,
                PriceYearly = 79_000m,
                MaxMembers = 1,
                MaxSocialAccounts = 20,
                MaxScheduledPostsPerMonth = int.MaxValue,
                StripeProductId = "prod_placeholder_basic",
                StripeMonthlyPriceId = "price_placeholder_basic_monthly",
                StripeYearlyPriceId = "price_placeholder_basic_yearly",
                IsActive = true,
                SortOrder = 1,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            },
            new Plan
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                Code = "PRO",
                Name = "Pro",
                Description = "For serious content creators.",
                PriceMonthly = 149_000m,
                PriceYearly = 119_000m,
                MaxMembers = 1,
                MaxSocialAccounts = 50,
                MaxScheduledPostsPerMonth = int.MaxValue,
                StripeProductId = "prod_placeholder_pro",
                StripeMonthlyPriceId = "price_placeholder_pro_monthly",
                StripeYearlyPriceId = "price_placeholder_pro_yearly",
                IsActive = true,
                SortOrder = 2,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            },
            new Plan
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Code = "MAX",
                Name = "Max",
                Description = "For teams & power creators.",
                PriceMonthly = 199_000m,
                PriceYearly = 159_000m,
                MaxMembers = 10,
                MaxSocialAccounts = int.MaxValue,
                MaxScheduledPostsPerMonth = int.MaxValue,
                StripeProductId = "prod_placeholder_max",
                StripeMonthlyPriceId = "price_placeholder_max_monthly",
                StripeYearlyPriceId = "price_placeholder_max_yearly",
                IsActive = true,
                SortOrder = 3,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            },
            new Plan
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000004"),
                Code = "STUDENT",
                Name = "Student",
                Description = "Discounted plan for verified students.",
                PriceMonthly = 59_000m,
                PriceYearly = 49_000m,
                MaxMembers = 1,
                MaxSocialAccounts = 20,
                MaxScheduledPostsPerMonth = int.MaxValue,
                MaxRepurposeGenerationsPerMonth = 15,
                StripeProductId = "prod_placeholder_student",
                StripeMonthlyPriceId = "price_placeholder_student_monthly",
                StripeYearlyPriceId = "price_placeholder_student_yearly",
                IsActive = true,
                SortOrder = 4,
                CreatedAtUtc = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                Version = 1
            }
        );
    }
}
