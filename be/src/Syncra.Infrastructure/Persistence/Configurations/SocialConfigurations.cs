using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class PostConfiguration : BaseWorkspaceEntityConfiguration<Post>
{
    public override void Configure(EntityTypeBuilder<Post> builder)
    {
        base.Configure(builder);
        builder.ToTable("posts");

        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.Title).IsRequired().HasMaxLength(200).HasColumnName("title");
        builder.Property(e => e.Content).IsRequired().HasColumnName("content");
        builder.Property(e => e.Status)
            .IsRequired()
            .HasMaxLength(50)
            .HasConversion<string>()
            .HasColumnName("status");
        builder.Property(e => e.ScheduledAtUtc).HasColumnName("scheduled_at_utc");
        builder.Property(e => e.PublishedAtUtc).HasColumnName("published_at_utc");
        builder.Property(e => e.IntegrationId).HasColumnName("integration_id");
        builder.Property(e => e.PublishExternalId)
            .HasMaxLength(200)
            .HasColumnName("publish_external_id");
        builder.Property(e => e.PublishExternalUrl)
            .HasMaxLength(1000)
            .HasColumnName("publish_external_url");
        builder.Property(e => e.PublishLastAttemptAtUtc)
            .HasColumnName("publish_last_attempt_at_utc");
        builder.Property(e => e.PublishLastError)
            .HasMaxLength(Post.PublishLastErrorMaxLength)
            .HasColumnName("publish_last_error");
        builder.Property(e => e.PublishProviderResponseMetadata)
            .HasColumnType("jsonb")
            .HasColumnName("publish_provider_response_metadata");

        builder.HasOne(e => e.Integration)
            .WithMany()
            .HasForeignKey(e => e.IntegrationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.Media)
            .WithOne(m => m.Post)
            .HasForeignKey(m => m.PostId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class IntegrationConfiguration : BaseWorkspaceEntityConfiguration<Integration>
{
    public override void Configure(EntityTypeBuilder<Integration> builder)
    {
        base.Configure(builder);
        builder.ToTable("integrations");

        builder.Property(e => e.Platform).IsRequired().HasMaxLength(50).HasColumnName("platform");
        builder.Property(e => e.ExternalAccountId).HasMaxLength(200).HasColumnName("external_account_id");
        builder.Property(e => e.AccessToken).HasColumnName("access_token");
        builder.Property(e => e.RefreshToken).HasColumnName("refresh_token");
        builder.Property(e => e.ExpiresAtUtc).HasColumnName("expires_at_utc");
        builder.Property(e => e.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(e => e.Metadata).HasColumnType("jsonb").HasColumnName("metadata");

        builder.Property(e => e.TokenRefreshLastAttemptAtUtc).HasColumnName("token_refresh_last_attempt_at_utc");
        builder.Property(e => e.TokenRefreshLastSuccessAtUtc).HasColumnName("token_refresh_last_success_at_utc");
        builder.Property(e => e.TokenRefreshLastError)
            .HasMaxLength(Integration.TokenRefreshLastErrorMaxLength)
            .HasColumnName("token_refresh_last_error");
        builder.Property(e => e.TokenRefreshHealthStatus)
            .HasMaxLength(20)
            .HasConversion<string>()
            .HasColumnName("token_refresh_health_status");
    }
}

public class MediaConfiguration : BaseEntityConfiguration<Media>
{
    public override void Configure(EntityTypeBuilder<Media> builder)
    {
        base.Configure(builder);
        builder.ToTable("media");

        builder.Property(e => e.PostId).HasColumnName("post_id");
        builder.Property(e => e.FileName).IsRequired().HasMaxLength(500).HasColumnName("file_name");
        builder.Property(e => e.FileUrl).IsRequired().HasMaxLength(1000).HasColumnName("file_url");
        builder.Property(e => e.MediaType).IsRequired().HasMaxLength(50).HasColumnName("media_type");
        builder.Property(e => e.MimeType).IsRequired().HasMaxLength(100).HasColumnName("mime_type");
        builder.Property(e => e.SizeBytes).HasColumnName("size_bytes");
    }
}
