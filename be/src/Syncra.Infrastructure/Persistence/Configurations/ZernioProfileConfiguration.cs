using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class ZernioProfileConfiguration : BaseWorkspaceEntityConfiguration<ZernioProfile>
{
    public override void Configure(EntityTypeBuilder<ZernioProfile> builder)
    {
        base.Configure(builder);
        builder.ToTable("zernio_profiles");

        builder.Property(e => e.ZernioProfileId).IsRequired().HasMaxLength(200).HasColumnName("zernio_profile_id");
        builder.Property(e => e.DisplayName).IsRequired().HasMaxLength(ZernioProfile.DisplayNameMaxLength).HasColumnName("display_name");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(ZernioProfile.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.AvatarUrl).HasMaxLength(ZernioProfile.AvatarUrlMaxLength).HasColumnName("avatar_url");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");

        builder.HasOne(e => e.Workspace)
            .WithMany(w => w.ZernioProfiles)
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.SocialAccounts)
            .WithOne(s => s.ZernioProfile)
            .HasForeignKey(s => s.ZernioProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.ZernioProfileId).IsUnique();
    }
}
