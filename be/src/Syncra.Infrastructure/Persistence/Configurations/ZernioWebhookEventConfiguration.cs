using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class ZernioWebhookEventConfiguration : BaseWorkspaceEntityConfiguration<ZernioWebhookEvent>
{
    public override void Configure(EntityTypeBuilder<ZernioWebhookEvent> builder)
    {
        base.Configure(builder);
        builder.ToTable("zernio_webhook_events");

        builder.Property(e => e.EventType).IsRequired().HasMaxLength(ZernioWebhookEvent.EventTypeMaxLength).HasColumnName("event_type");
        builder.Property(e => e.Payload).IsRequired().HasColumnType("jsonb").HasColumnName("payload");
        builder.Property(e => e.Status).IsRequired().HasMaxLength(20).HasConversion<string>().HasColumnName("status");
        builder.Property(e => e.ErrorMessage).HasMaxLength(ZernioWebhookEvent.ErrorMessageMaxLength).HasColumnName("error_message");
        builder.Property(e => e.ProcessedAtUtc).HasColumnName("processed_at_utc");
        builder.Property(e => e.PostId).HasColumnName("post_id");

        builder.HasOne(e => e.Post)
            .WithMany()
            .HasForeignKey(e => e.PostId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.Status, e.CreatedAtUtc });
    }
}
