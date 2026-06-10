using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class RepurposeSessionConfiguration : BaseWorkspaceEntityConfiguration<RepurposeSession>
{
    public override void Configure(EntityTypeBuilder<RepurposeSession> builder)
    {
        base.Configure(builder);
        builder.ToTable("repurpose_sessions");

        builder.Property(e => e.SourceText).IsRequired().HasColumnName("source_text");
        builder.Property(e => e.Tone).IsRequired().HasMaxLength(100).HasColumnName("tone");
        builder.Property(e => e.TargetPlatforms).IsRequired().HasColumnName("target_platforms");
        builder.Property(e => e.ContentLength).IsRequired().HasMaxLength(50).HasColumnName("content_length");
        builder.Property(e => e.Language).IsRequired().HasMaxLength(20).HasColumnName("language");
        builder.Property(e => e.ExtractAtoms).IsRequired().HasColumnName("extract_atoms");
        builder.Property(e => e.Status).IsRequired().HasColumnName("status").HasConversion<string>();
        builder.Property(e => e.ErrorMessage).HasColumnName("error_message");
        builder.Property(e => e.SupportingSourcesJson).HasColumnName("supporting_sources_json");

        builder.HasMany(e => e.Atoms)
            .WithOne(e => e.Session)
            .HasForeignKey(e => e.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.CreatedAtUtc });
    }
}
