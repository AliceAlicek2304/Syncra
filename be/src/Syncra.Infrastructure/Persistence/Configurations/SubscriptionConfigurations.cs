using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class PlanConfiguration : BaseEntityConfiguration<Plan>
{
    public override void Configure(EntityTypeBuilder<Plan> builder)
    {
        base.Configure(builder);
        builder.ToTable("plans");

        builder.Property(e => e.Code).IsRequired().HasMaxLength(50).HasColumnName("code");
        builder.Property(e => e.Name).IsRequired().HasMaxLength(100).HasColumnName("name");
        builder.Property(e => e.Description).HasMaxLength(500).HasColumnName("description");
        builder.Property(e => e.PriceMonthly).HasPrecision(18, 2).HasColumnName("price_monthly");
        builder.Property(e => e.PriceYearly).HasPrecision(18, 2).HasColumnName("price_yearly");
        builder.Property(e => e.MaxMembers).HasColumnName("max_members");
        builder.Property(e => e.MaxSocialAccounts).HasColumnName("max_social_accounts");
        builder.Property(e => e.MaxScheduledPostsPerMonth).HasColumnName("max_scheduled_posts_per_month");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(e => e.SortOrder).HasColumnName("sort_order");

        builder.HasIndex(e => e.Code).IsUnique();
    }
}

public class SubscriptionConfiguration : BaseWorkspaceEntityConfiguration<Subscription>
{
    public override void Configure(EntityTypeBuilder<Subscription> builder)
    {
        base.Configure(builder);
        builder.ToTable("subscriptions");

        builder.Property(e => e.PlanId).HasColumnName("plan_id");
        builder.Property(e => e.Provider).HasMaxLength(50).HasColumnName("provider");
        builder.Property(e => e.ProviderSubscriptionId).HasMaxLength(200).HasColumnName("provider_subscription_id");
        builder.Property(e => e.Status).HasMaxLength(50).HasColumnName("status").HasConversion<string>();
        builder.Property(e => e.StartsAtUtc).HasColumnName("starts_at_utc");
        builder.Property(e => e.EndsAtUtc).HasColumnName("ends_at_utc");
        builder.Property(e => e.TrialEndsAtUtc).HasColumnName("trial_ends_at_utc");
        builder.Property(e => e.CanceledAtUtc).HasColumnName("canceled_at_utc");

        builder.HasOne(e => e.Plan)
            .WithMany()
            .HasForeignKey(e => e.PlanId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
