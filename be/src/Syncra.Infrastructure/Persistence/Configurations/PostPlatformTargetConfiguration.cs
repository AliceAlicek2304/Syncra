using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class PostPlatformTargetConfiguration : BaseWorkspaceEntityConfiguration<PostPlatformTarget>
{
    public override void Configure(EntityTypeBuilder<PostPlatformTarget> builder)
    {
        base.Configure(builder);
        builder.ToTable("post_platform_targets");

        builder.Property(e => e.Platform).IsRequired().HasMaxLength(PostPlatformTarget.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.Status).IsRequired().HasMaxLength(20).HasConversion<string>().HasColumnName("status");
        builder.Property(e => e.ExternalPostId).HasMaxLength(PostPlatformTarget.ExternalPostIdMaxLength).HasColumnName("external_post_id");
        builder.Property(e => e.ExternalPostUrl).HasMaxLength(2000).HasColumnName("external_post_url");
        builder.Property(e => e.ErrorMessage).HasMaxLength(PostPlatformTarget.ErrorMessageMaxLength).HasColumnName("error_message");
        builder.Property(e => e.ZernioAccountId).HasMaxLength(PostPlatformTarget.ZernioAccountIdMaxLength).HasColumnName("zernio_account_id");
        builder.Property(e => e.AttemptCount).HasDefaultValue(0).HasColumnName("attempt_count");
        builder.Property(e => e.LastAttemptAtUtc).HasColumnName("last_attempt_at_utc");
        builder.Property(e => e.PostId).IsRequired().HasColumnName("post_id");

        builder.HasOne(e => e.Post)
            .WithMany(p => p.PlatformTargets)
            .HasForeignKey(e => e.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
