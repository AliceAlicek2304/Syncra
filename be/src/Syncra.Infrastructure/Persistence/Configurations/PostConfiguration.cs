using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;
using Syncra.Domain.ValueObjects;
using Syncra.Infrastructure.Persistence.Converters;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class PostConfiguration : BaseWorkspaceEntityConfiguration<Post>
{
    public override void Configure(EntityTypeBuilder<Post> builder)
    {
        base.Configure(builder);
        builder.ToTable("posts");

        // Value object properties with converters
        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(PostTitle.MaxLength)
            .HasColumnName("title")
            .HasConversion(ValueObjectConverters.PostTitleConverter);

        builder.Property(e => e.Content)
            .IsRequired()
            .HasColumnName("content")
            .HasConversion(ValueObjectConverters.PostContentConverter);

        builder.Property(e => e.ScheduledAt)
            .HasColumnName("scheduled_at_utc")
            .HasConversion(ValueObjectConverters.ScheduledTimeConverter);

        // Primitive properties
        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.PublishedAtUtc).HasColumnName("published_at_utc");
        builder.Property(e => e.Status).HasColumnName("status").HasConversion<string>();
        builder.Property(e => e.IntegrationId).HasColumnName("integration_id");

        // Publishing result properties
        builder.Property(e => e.PublishExternalId).HasMaxLength(200).HasColumnName("publish_external_id");
        builder.Property(e => e.PublishExternalUrl).HasMaxLength(2000).HasColumnName("publish_external_url");
        builder.Property(e => e.PublishLastAttemptAtUtc).HasColumnName("publish_last_attempt_at_utc");
        builder.Property(e => e.PublishLastError).HasMaxLength(Post.PublishLastErrorMaxLength).HasColumnName("publish_last_error");
        builder.Property(e => e.PublishProviderResponseMetadata).HasColumnType("jsonb").HasColumnName("publish_provider_response_metadata");

        // Relationships
        builder.HasOne(e => e.User)
            .WithMany(u => u.Posts)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Integration)
            .WithMany(i => i.Posts)
            .HasForeignKey(e => e.IntegrationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.Media)
            .WithOne(m => m.Post)
            .HasForeignKey(m => m.PostId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}