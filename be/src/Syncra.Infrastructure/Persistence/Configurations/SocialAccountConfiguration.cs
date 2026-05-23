using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class SocialAccountConfiguration : BaseWorkspaceEntityConfiguration<SocialAccount>
{
    public override void Configure(EntityTypeBuilder<SocialAccount> builder)
    {
        base.Configure(builder);
        builder.ToTable("social_accounts");

        builder.Property(e => e.ExternalAccountId).IsRequired().HasMaxLength(SocialAccount.ExternalAccountIdMaxLength).HasColumnName("external_account_id");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(SocialAccount.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.DisplayName).IsRequired().HasMaxLength(SocialAccount.DisplayNameMaxLength).HasColumnName("display_name");
        builder.Property(e => e.AvatarUrl).HasMaxLength(SocialAccount.AvatarUrlMaxLength).HasColumnName("avatar_url");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(e => e.ConnectedAtUtc).HasColumnName("connected_at_utc");
        builder.Property(e => e.ZernioProfileId).IsRequired().HasColumnName("zernio_profile_id");

        builder.HasOne(e => e.ZernioProfile)
            .WithMany(z => z.SocialAccounts)
            .HasForeignKey(e => e.ZernioProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
