using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class UsageCounterConfiguration : BaseWorkspaceEntityConfiguration<UsageCounter>
{
    public override void Configure(EntityTypeBuilder<UsageCounter> builder)
    {
        base.Configure(builder);
        builder.ToTable("usage_counters");

        builder.Property(e => e.MetricCode).IsRequired().HasMaxLength(50).HasColumnName("metric_code");
        builder.Property(e => e.PeriodStartUtc).HasColumnName("period_start_utc");
        builder.Property(e => e.PeriodEndUtc).HasColumnName("period_end_utc");
        builder.Property(e => e.Value).HasColumnName("value");

        builder.HasIndex(e => new { e.WorkspaceId, e.MetricCode, e.PeriodStartUtc }).IsUnique();
    }
}

public class AuditLogConfiguration : BaseEntityConfiguration<AuditLog>
{
    public override void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        base.Configure(builder);
        builder.ToTable("audit_logs");

        builder.Property(e => e.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.ActorType).HasMaxLength(50).HasColumnName("actor_type").HasConversion<string>();
        builder.Property(e => e.Action).IsRequired().HasMaxLength(100).HasColumnName("action");
        builder.Property(e => e.EntityType).IsRequired().HasMaxLength(100).HasColumnName("entity_type");
        builder.Property(e => e.EntityId).IsRequired().HasMaxLength(100).HasColumnName("entity_id");
        builder.Property(e => e.Result).HasMaxLength(50).HasColumnName("result").HasConversion<string>();
        builder.Property(e => e.IpAddress).HasMaxLength(50).HasColumnName("ip_address");
        builder.Property(e => e.UserAgent).HasMaxLength(500).HasColumnName("user_agent");
        builder.Property(e => e.CorrelationId).HasMaxLength(100).HasColumnName("correlation_id");
        builder.Property(e => e.DetailsJson).HasColumnType("jsonb").HasColumnName("details_json");
        
        builder.HasIndex(e => e.WorkspaceId);
        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.CreatedAtUtc);
    }
}

public class IdempotencyRecordConfiguration : BaseEntityConfiguration<IdempotencyRecord>
{
    public override void Configure(EntityTypeBuilder<IdempotencyRecord> builder)
    {
        base.Configure(builder);
        builder.ToTable("idempotency_records");

        builder.Property(e => e.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.Key).IsRequired().HasMaxLength(200).HasColumnName("key");
        builder.Property(e => e.RequestHash).IsRequired().HasMaxLength(500).HasColumnName("request_hash");
        builder.Property(e => e.Endpoint).IsRequired().HasMaxLength(200).HasColumnName("endpoint");
        builder.Property(e => e.Method).IsRequired().HasMaxLength(10).HasColumnName("method");
        builder.Property(e => e.Status).HasMaxLength(50).HasColumnName("status").HasConversion<string>();
        builder.Property(e => e.ResponseStatusCode).HasColumnName("response_status_code");
        builder.Property(e => e.ResponseBody).HasColumnType("jsonb").HasColumnName("response_body");
        builder.Property(e => e.LockedUntilUtc).HasColumnName("locked_until_utc");
        builder.Property(e => e.CompletedAtUtc).HasColumnName("completed_at_utc");
        builder.Property(e => e.ExpiresAtUtc).HasColumnName("expires_at_utc");
        builder.Property(e => e.AttemptCount).HasDefaultValue(0).HasColumnName("attempt_count");
        builder.Property(e => e.LastError).HasColumnType("jsonb").HasColumnName("last_error");

        builder.HasIndex(e => e.Key).IsUnique();
        builder.HasIndex(e => e.ExpiresAtUtc);
    }
}
