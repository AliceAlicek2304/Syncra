using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class UserSessionConfiguration : BaseEntityConfiguration<UserSession>
{
    public override void Configure(EntityTypeBuilder<UserSession> builder)
    {
        base.Configure(builder);
        builder.ToTable("user_sessions");

        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.DeviceName).HasMaxLength(200).HasColumnName("device_name");
        builder.Property(e => e.IpAddress).HasMaxLength(50).HasColumnName("ip_address");
        builder.Property(e => e.UserAgent).HasMaxLength(500).HasColumnName("user_agent");
        builder.Property(e => e.IssuedAtUtc).HasColumnName("issued_at_utc");
        builder.Property(e => e.ExpiresAtUtc).HasColumnName("expires_at_utc");
        builder.Property(e => e.RevokedAtUtc).HasColumnName("revoked_at_utc");
        builder.Property(e => e.LastSeenAtUtc).HasColumnName("last_seen_at_utc");

        builder.HasMany(e => e.RefreshTokens)
            .WithOne(t => t.Session)
            .HasForeignKey(t => t.UserSessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class RefreshTokenConfiguration : BaseEntityConfiguration<RefreshToken>
{
    public override void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        base.Configure(builder);
        builder.ToTable("refresh_tokens");

        builder.Property(e => e.UserSessionId).HasColumnName("user_session_id");
        builder.Property(e => e.TokenHash).IsRequired().HasMaxLength(500).HasColumnName("token_hash");
        builder.Property(e => e.ExpiresAtUtc).HasColumnName("expires_at_utc");
        builder.Property(e => e.RotatedAtUtc).HasColumnName("rotated_at_utc");
        builder.Property(e => e.RevokedAtUtc).HasColumnName("revoked_at_utc");
        builder.Property(e => e.ReplacedByTokenId).HasColumnName("replaced_by_token_id");

        builder.HasIndex(e => e.TokenHash).IsUnique();
    }
}
