using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public sealed class ActivityEventConfiguration : BaseEntityConfiguration<ActivityEvent>
{
    public override void Configure(EntityTypeBuilder<ActivityEvent> builder)
    {
        base.Configure(builder);
        builder.ToTable("activity_events");

        builder.Property(e => e.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.EventType).IsRequired().HasMaxLength(100).HasColumnName("event_type");
        builder.Property(e => e.EventGroup).IsRequired().HasMaxLength(40).HasColumnName("event_group");
        builder.Property(e => e.Status).IsRequired().HasMaxLength(20).HasColumnName("status");
        builder.Property(e => e.Title).IsRequired().HasMaxLength(160).HasColumnName("title");
        builder.Property(e => e.Description).HasMaxLength(500).HasColumnName("description");
        builder.Property(e => e.SubjectType).HasMaxLength(60).HasColumnName("subject_type");
        builder.Property(e => e.SubjectId).HasMaxLength(100).HasColumnName("subject_id");
        builder.Property(e => e.IpAddress).HasMaxLength(64).HasColumnName("ip_address");
        builder.Property(e => e.UserAgent).HasMaxLength(500).HasColumnName("user_agent");

        builder.HasIndex(e => e.CreatedAtUtc).HasDatabaseName("ix_activity_events_created_at_utc");
        builder.HasIndex(e => new { e.EventGroup, e.CreatedAtUtc }).HasDatabaseName("ix_activity_events_group_created_at_utc");
        builder.HasIndex(e => new { e.WorkspaceId, e.CreatedAtUtc }).HasDatabaseName("ix_activity_events_workspace_created_at_utc");
        builder.HasIndex(e => new { e.UserId, e.CreatedAtUtc }).HasDatabaseName("ix_activity_events_user_created_at_utc");
    }
}
