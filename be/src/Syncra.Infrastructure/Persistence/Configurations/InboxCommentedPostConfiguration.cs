using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxCommentedPostConfiguration : BaseWorkspaceEntityConfiguration<InboxCommentedPost>
{
    public override void Configure(EntityTypeBuilder<InboxCommentedPost> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_commented_posts");

        builder.Property(e => e.ZernioPostId).IsRequired().HasMaxLength(InboxCommentedPost.ZernioPostIdMaxLength).HasColumnName("zernio_post_id");
        builder.Property(e => e.SocialAccountId).HasColumnName("social_account_id");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(InboxCommentedPost.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.ZernioAccountId).HasMaxLength(InboxCommentedPost.ZernioAccountIdMaxLength).HasColumnName("zernio_account_id");
        builder.Property(e => e.AccountUsername).HasMaxLength(InboxCommentedPost.AccountUsernameMaxLength).HasColumnName("account_username");
        builder.Property(e => e.PostPreviewCaption).HasMaxLength(InboxCommentedPost.PostPreviewCaptionMaxLength).HasColumnName("post_preview_caption");
        builder.Property(e => e.PostPreviewThumbnailUrl).HasMaxLength(InboxCommentedPost.PostPreviewThumbnailUrlMaxLength).HasColumnName("post_preview_thumbnail_url");
        builder.Property(e => e.CommentCount).HasDefaultValue(0).HasColumnName("comment_count");
        builder.Property(e => e.ZernioTopCommentId).HasMaxLength(InboxCommentedPost.ZernioTopCommentIdMaxLength).HasColumnName("zernio_top_comment_id");
        builder.Property(e => e.IsRead).HasDefaultValue(false).HasColumnName("is_read");
        builder.Property(e => e.ReceivedAtUtc).IsRequired().HasColumnName("received_at_utc");
        builder.Property(e => e.LikeCount).HasColumnName("like_count");
        builder.Property(e => e.Subreddit).HasMaxLength(InboxCommentedPost.SubredditMaxLength).HasColumnName("subreddit");
        builder.Property(e => e.IsAd).HasColumnName("is_ad");
        builder.Property(e => e.AdId).HasMaxLength(InboxCommentedPost.AdIdMaxLength).HasColumnName("ad_id");
        builder.Property(e => e.Placement).HasMaxLength(InboxCommentedPost.PlacementMaxLength).HasColumnName("placement");
        builder.Property(e => e.Permalink).HasMaxLength(InboxCommentedPost.PermalinkMaxLength).HasColumnName("permalink");

        builder.HasOne(e => e.SocialAccount)
            .WithMany()
            .HasForeignKey(e => e.SocialAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioPostId }).IsUnique();
        builder.HasIndex(e => new { e.WorkspaceId, e.ReceivedAtUtc }).IsDescending(false, true);
        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioAccountId, e.ZernioPostId });
    }
}
