using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class UserProfileConfiguration : BaseEntityConfiguration<UserProfile>
{
    public override void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        base.Configure(builder);
        builder.ToTable("user_profiles");

        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.DisplayName).HasMaxLength(200).HasColumnName("display_name");
        builder.Property(e => e.FirstName).HasMaxLength(100).HasColumnName("first_name");
        builder.Property(e => e.LastName).HasMaxLength(100).HasColumnName("last_name");
        builder.Property(e => e.AvatarUrl).HasMaxLength(500).HasColumnName("avatar_url");
        builder.Property(e => e.Timezone).HasMaxLength(100).HasColumnName("timezone");
        builder.Property(e => e.Locale).HasMaxLength(10).HasColumnName("locale");
    }
}
