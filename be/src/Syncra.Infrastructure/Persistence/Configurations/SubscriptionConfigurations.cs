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
        builder.Property(e => e.StripeProductId).HasMaxLength(100).HasColumnName("stripe_product_id");
        builder.Property(e => e.StripeMonthlyPriceId).HasMaxLength(100).HasColumnName("stripe_monthly_price_id");
        builder.Property(e => e.StripeYearlyPriceId).HasMaxLength(100).HasColumnName("stripe_yearly_price_id");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(e => e.SortOrder).HasColumnName("sort_order");
        builder.Property(e => e.LastEventTimestampUtc).HasColumnName("last_event_timestamp_utc");

        builder.HasIndex(e => e.Code).IsUnique();
        builder.HasIndex(e => e.StripeMonthlyPriceId).IsUnique().HasFilter("stripe_monthly_price_id IS NOT NULL");
        builder.HasIndex(e => e.StripeYearlyPriceId).IsUnique().HasFilter("stripe_yearly_price_id IS NOT NULL");
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
        builder.Property(e => e.ProviderCustomerId).HasMaxLength(200).HasColumnName("provider_customer_id");
        builder.Property(e => e.ProviderSubscriptionId).HasMaxLength(200).HasColumnName("provider_subscription_id");
        builder.Property(e => e.Status).HasMaxLength(50).HasColumnName("status").HasConversion<string>();
        builder.Property(e => e.StartsAtUtc).HasColumnName("starts_at_utc");
        builder.Property(e => e.EndsAtUtc).HasColumnName("ends_at_utc");
        builder.Property(e => e.TrialEndsAtUtc).HasColumnName("trial_ends_at_utc");
        builder.Property(e => e.CanceledAtUtc).HasColumnName("canceled_at_utc");
        builder.Property(e => e.LastEventTimestampUtc).HasColumnName("last_event_timestamp_utc");

        builder.HasIndex(e => e.WorkspaceId).HasDatabaseName("ix_subscriptions_workspace_id");

        builder.HasOne(e => e.Plan)
            .WithMany()
            .HasForeignKey(e => e.PlanId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class BillingPaymentConfiguration : BaseWorkspaceEntityConfiguration<BillingPayment>
{
    public override void Configure(EntityTypeBuilder<BillingPayment> builder)
    {
        base.Configure(builder);
        builder.ToTable("billing_payments");

        builder.Property(e => e.SubscriptionId).HasColumnName("subscription_id");
        builder.Property(e => e.PlanId).HasColumnName("plan_id");
        builder.Property(e => e.Provider).IsRequired().HasMaxLength(50).HasColumnName("provider");
        builder.Property(e => e.ProviderPaymentId).IsRequired().HasMaxLength(200).HasColumnName("provider_payment_id");
        builder.Property(e => e.ProviderSubscriptionId).HasMaxLength(200).HasColumnName("provider_subscription_id");
        builder.Property(e => e.Amount).HasPrecision(18, 2).HasColumnName("amount");
        builder.Property(e => e.OriginalAmount).HasPrecision(18, 2).HasColumnName("original_amount");
        builder.Property(e => e.Currency).IsRequired().HasMaxLength(10).HasColumnName("currency");
        builder.Property(e => e.Interval).IsRequired().HasMaxLength(20).HasColumnName("interval");
        builder.Property(e => e.DiscountCode).HasMaxLength(100).HasColumnName("discount_code");
        builder.Property(e => e.DiscountPercentOff).HasPrecision(5, 2).HasColumnName("discount_percent_off");
        builder.Property(e => e.PaidAtUtc).HasColumnName("paid_at_utc");

        builder.HasIndex(e => new { e.Provider, e.ProviderPaymentId }).IsUnique();
        builder.HasIndex(e => e.WorkspaceId).HasDatabaseName("ix_billing_payments_workspace_id");
        builder.HasIndex(e => e.PaidAtUtc).HasDatabaseName("ix_billing_payments_paid_at_utc");

        builder.HasOne(e => e.Plan)
            .WithMany()
            .HasForeignKey(e => e.PlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Subscription)
            .WithMany()
            .HasForeignKey(e => e.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class BillingVoucherConfiguration : BaseEntityConfiguration<BillingVoucher>
{
    public override void Configure(EntityTypeBuilder<BillingVoucher> builder)
    {
        base.Configure(builder);
        builder.ToTable("billing_vouchers");

        builder.Property(e => e.Code).IsRequired().HasMaxLength(100).HasColumnName("code");
        builder.Property(e => e.Name).IsRequired().HasMaxLength(150).HasColumnName("name");
        builder.Property(e => e.Description).HasMaxLength(500).HasColumnName("description");
        builder.Property(e => e.DiscountType).IsRequired().HasMaxLength(20).HasColumnName("discount_type");
        builder.Property(e => e.PercentOff).HasPrecision(5, 2).HasColumnName("percent_off");
        builder.Property(e => e.AmountOff).HasPrecision(18, 2).HasColumnName("amount_off");
        builder.Property(e => e.Currency).IsRequired().HasMaxLength(10).HasColumnName("currency");
        builder.Property(e => e.MinimumAmount).HasPrecision(18, 2).HasColumnName("minimum_amount");
        builder.Property(e => e.ApplicablePlanCodesJson).HasColumnType("jsonb").HasColumnName("applicable_plan_codes_json");
        builder.Property(e => e.ApplicableIntervalsJson).HasColumnType("jsonb").HasColumnName("applicable_intervals_json");
        builder.Property(e => e.MaxRedemptions).HasColumnName("max_redemptions");
        builder.Property(e => e.MaxRedemptionsPerUser).HasColumnName("max_redemptions_per_user");
        builder.Property(e => e.RedeemedCount).HasColumnName("redeemed_count");
        builder.Property(e => e.StartsAtUtc).HasColumnName("starts_at_utc");
        builder.Property(e => e.ExpiresAtUtc).HasColumnName("expires_at_utc");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(e => e.RequiresStudentVerification).HasColumnName("requires_student_verification");
        builder.Property(e => e.Source).IsRequired().HasMaxLength(50).HasColumnName("source");

        builder.HasIndex(e => e.Code)
            .IsUnique()
            .HasDatabaseName("ix_billing_vouchers_code");
        builder.HasIndex(e => e.IsActive).HasDatabaseName("ix_billing_vouchers_is_active");
        builder.HasIndex(e => e.ExpiresAtUtc).HasDatabaseName("ix_billing_vouchers_expires_at_utc");
    }
}

public class BillingVoucherRedemptionConfiguration : BaseWorkspaceEntityConfiguration<BillingVoucherRedemption>
{
    public override void Configure(EntityTypeBuilder<BillingVoucherRedemption> builder)
    {
        base.Configure(builder);
        builder.ToTable("billing_voucher_redemptions");

        builder.Property(e => e.VoucherId).HasColumnName("voucher_id");
        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.PlanId).HasColumnName("plan_id");
        builder.Property(e => e.SubscriptionId).HasColumnName("subscription_id");
        builder.Property(e => e.BillingPaymentId).HasColumnName("billing_payment_id");
        builder.Property(e => e.VoucherCode).IsRequired().HasMaxLength(100).HasColumnName("voucher_code");
        builder.Property(e => e.Status).IsRequired().HasMaxLength(30).HasColumnName("status");
        builder.Property(e => e.CheckoutSessionId).HasMaxLength(200).HasColumnName("checkout_session_id");
        builder.Property(e => e.PaymentProvider).HasMaxLength(50).HasColumnName("payment_provider");
        builder.Property(e => e.OriginalAmount).HasPrecision(18, 2).HasColumnName("original_amount");
        builder.Property(e => e.DiscountAmount).HasPrecision(18, 2).HasColumnName("discount_amount");
        builder.Property(e => e.FinalAmount).HasPrecision(18, 2).HasColumnName("final_amount");
        builder.Property(e => e.Currency).IsRequired().HasMaxLength(10).HasColumnName("currency");
        builder.Property(e => e.RedeemedAtUtc).HasColumnName("redeemed_at_utc");

        builder.HasIndex(e => e.VoucherId).HasDatabaseName("ix_billing_voucher_redemptions_voucher_id");
        builder.HasIndex(e => e.UserId).HasDatabaseName("ix_billing_voucher_redemptions_user_id");
        builder.HasIndex(e => e.WorkspaceId).HasDatabaseName("ix_billing_voucher_redemptions_workspace_id");
        builder.HasIndex(e => e.RedeemedAtUtc).HasDatabaseName("ix_billing_voucher_redemptions_redeemed_at_utc");
        builder.HasIndex(e => e.CheckoutSessionId)
            .IsUnique()
            .HasFilter("checkout_session_id IS NOT NULL")
            .HasDatabaseName("ix_billing_voucher_redemptions_checkout_session_id");

        builder.HasOne(e => e.Voucher)
            .WithMany()
            .HasForeignKey(e => e.VoucherId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Plan)
            .WithMany()
            .HasForeignKey(e => e.PlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Subscription)
            .WithMany()
            .HasForeignKey(e => e.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.BillingPayment)
            .WithMany()
            .HasForeignKey(e => e.BillingPaymentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
