using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class IntegrationConfiguration : BaseWorkspaceEntityConfiguration<Integration>
{
    public override void Configure(EntityTypeBuilder<Integration> builder)
    {
        base.Configure(builder);
        builder.ToTable("integrations");

        // Primitive properties with private setters
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(50).HasColumnName("platform");
        builder.Property(e => e.ExternalAccountId).HasMaxLength(200).HasColumnName("external_account_id");
        builder.Property(e => e.AccessToken).HasColumnName("access_token");
        builder.Property(e => e.RefreshToken).HasColumnName("refresh_token");
        builder.Property(e => e.ExpiresAtUtc).HasColumnName("expires_at_utc");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(e => e.Metadata).HasColumnType("jsonb").HasColumnName("metadata");

        // Token refresh tracking properties
        builder.Property(e => e.TokenRefreshLastAttemptAtUtc).HasColumnName("token_refresh_last_attempt_at_utc");
        builder.Property(e => e.TokenRefreshLastSuccessAtUtc).HasColumnName("token_refresh_last_success_at_utc");
        builder.Property(e => e.TokenRefreshLastError)
            .HasMaxLength(Integration.TokenRefreshLastErrorMaxLength)
            .HasColumnName("token_refresh_last_error");
        builder.Property(e => e.TokenRefreshHealthStatus)
            .HasMaxLength(20)
            .HasConversion<string>()
            .HasColumnName("token_refresh_health_status");
        builder.Property(e => e.TokenRefreshConsecutiveFailures)
            .HasDefaultValue(0)
            .HasColumnName("token_refresh_consecutive_failures");

        // Relationships
        builder.HasOne(e => e.Workspace)
            .WithMany(w => w.Integrations)
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}