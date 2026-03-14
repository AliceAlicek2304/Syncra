using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class UserConfiguration : BaseEntityConfiguration<User>
{
    public override void Configure(EntityTypeBuilder<User> builder)
    {
        base.Configure(builder);
        builder.ToTable("users");

        builder.Property(e => e.Email).IsRequired().HasMaxLength(256).HasColumnName("email");
        builder.HasIndex(e => e.Email).IsUnique();
        
        builder.Property(e => e.NormalizedEmail).IsRequired().HasMaxLength(256).HasColumnName("normalized_email");
        builder.HasIndex(e => e.NormalizedEmail).IsUnique();

        builder.Property(e => e.PasswordHash).IsRequired().HasColumnName("password_hash");
        builder.Property(e => e.Status).IsRequired().HasMaxLength(50).HasColumnName("status");
        builder.Property(e => e.EmailVerifiedAtUtc).HasColumnName("email_verified_at_utc");
        builder.Property(e => e.LastLoginAtUtc).HasColumnName("last_login_at_utc");

        builder.HasOne(e => e.Profile)
            .WithOne(p => p.User)
            .HasForeignKey<UserProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Sessions)
            .WithOne(s => s.User)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
