using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public sealed class NotificationConfiguration : BaseWorkspaceEntityConfiguration<Notification>
{
    public override void Configure(EntityTypeBuilder<Notification> builder)
    {
        base.Configure(builder);
        builder.ToTable("notifications");

        builder.Property(e => e.UserId).HasColumnName("user_id");

        builder.Property(e => e.Type)
            .IsRequired()
            .HasMaxLength(100)
            .HasColumnName("type");

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("title");

        builder.Property(e => e.Body)
            .IsRequired()
            .HasMaxLength(1000)
            .HasColumnName("body");

        builder.Property(e => e.PayloadJson)
            .HasColumnType("jsonb")
            .HasColumnName("payload_json");

        builder.Property(e => e.ReadAtUtc).HasColumnName("read_at_utc");

        builder.HasIndex(e => new { e.WorkspaceId, e.CreatedAtUtc });
        builder.HasIndex(e => new { e.WorkspaceId, e.UserId, e.ReadAtUtc });
    }
}
