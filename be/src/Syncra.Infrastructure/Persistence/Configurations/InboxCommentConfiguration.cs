using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxCommentConfiguration : BaseWorkspaceEntityConfiguration<InboxComment>
{
    public override void Configure(EntityTypeBuilder<InboxComment> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_comments");

        builder.Property(e => e.ZernioCommentId).IsRequired().HasMaxLength(InboxComment.ZernioCommentIdMaxLength).HasColumnName("zernio_comment_id");
        builder.Property(e => e.SocialAccountId).HasColumnName("social_account_id");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(InboxComment.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.AuthorName).IsRequired().HasMaxLength(InboxComment.AuthorNameMaxLength).HasColumnName("author_name");
        builder.Property(e => e.AuthorUsername).HasMaxLength(InboxComment.AuthorUsernameMaxLength).HasColumnName("author_username");
        builder.Property(e => e.AuthorPicture).HasMaxLength(InboxComment.AuthorPictureMaxLength).HasColumnName("author_picture");
        builder.Property(e => e.BodyText).IsRequired().HasMaxLength(InboxComment.BodyTextMaxLength).HasColumnName("body_text");
        builder.Property(e => e.ZernioPostId).HasMaxLength(InboxComment.ZernioPostIdMaxLength).HasColumnName("zernio_post_id");
        builder.Property(e => e.ZernioAccountId).HasMaxLength(InboxComment.ZernioAccountIdMaxLength).HasColumnName("zernio_account_id");
        builder.Property(e => e.PostPreviewCaption).HasMaxLength(InboxComment.PostPreviewCaptionMaxLength).HasColumnName("post_preview_caption");
        builder.Property(e => e.PostPreviewThumbnailUrl).HasMaxLength(InboxComment.PostPreviewThumbnailUrlMaxLength).HasColumnName("post_preview_thumbnail_url");
        builder.Property(e => e.ParentCommentId).HasMaxLength(InboxComment.ParentCommentIdMaxLength).HasColumnName("parent_comment_id");
        builder.Property(e => e.CommentCount).HasDefaultValue(0).HasColumnName("comment_count");
        builder.Property(e => e.ZernioTopCommentId).HasMaxLength(InboxComment.ZernioTopCommentIdMaxLength).HasColumnName("zernio_top_comment_id");
        builder.Property(e => e.IsReply).HasDefaultValue(false).HasColumnName("is_reply");
        builder.Property(e => e.IsRead).HasDefaultValue(false).HasColumnName("is_read");
        builder.Property(e => e.ReceivedAtUtc).IsRequired().HasColumnName("received_at_utc");

        builder.HasOne(e => e.SocialAccount)
            .WithMany()
            .HasForeignKey(e => e.SocialAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioCommentId }).IsUnique();
        builder.HasIndex(e => new { e.WorkspaceId, e.ReceivedAtUtc }).IsDescending(false, true);
    }
}
