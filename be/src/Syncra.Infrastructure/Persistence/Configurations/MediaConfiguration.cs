using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class MediaConfiguration : BaseWorkspaceEntityConfiguration<Media>
{
    public override void Configure(EntityTypeBuilder<Media> builder)
    {
        base.Configure(builder);
        builder.ToTable("media");

        // Properties with private setters
        builder.Property(e => e.PostId).HasColumnName("post_id");
        builder.Property(e => e.FileName).IsRequired().HasMaxLength(500).HasColumnName("file_name");
        builder.Property(e => e.FileUrl).IsRequired().HasMaxLength(1000).HasColumnName("file_url");
        builder.Property(e => e.MediaType).IsRequired().HasMaxLength(50).HasColumnName("media_type");
        builder.Property(e => e.MimeType).IsRequired().HasMaxLength(100).HasColumnName("mime_type");
        builder.Property(e => e.SizeBytes).HasColumnName("size_bytes");

        // Relationships
        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Post)
            .WithMany(p => p.Media)
            .HasForeignKey(e => e.PostId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}