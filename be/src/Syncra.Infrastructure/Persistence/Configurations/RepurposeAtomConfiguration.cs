using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class RepurposeAtomConfiguration : BaseEntityConfiguration<RepurposeAtom>
{
    public override void Configure(EntityTypeBuilder<RepurposeAtom> builder)
    {
        base.Configure(builder);
        builder.ToTable("repurpose_atoms");

        builder.Property(e => e.SessionId).IsRequired().HasColumnName("session_id");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(50).HasColumnName("platform");
        builder.Property(e => e.Type).IsRequired().HasMaxLength(50).HasColumnName("type");
        builder.Property(e => e.Content).IsRequired().HasColumnName("content");
        builder.Property(e => e.Title).HasMaxLength(500).HasColumnName("title");
        builder.Property(e => e.SuggestedHashtags).HasColumnName("suggested_hashtags");
        builder.Property(e => e.SuggestedCTA).HasColumnName("suggested_cta");
        builder.Property(e => e.MediaUrl).HasColumnName("media_url");
        builder.Property(e => e.MediaType).HasColumnName("media_type").HasMaxLength(50);

        builder.HasIndex(e => e.SessionId);
    }
}
