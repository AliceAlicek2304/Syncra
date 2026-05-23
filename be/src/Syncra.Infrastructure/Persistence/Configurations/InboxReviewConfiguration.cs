using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxReviewConfiguration : BaseWorkspaceEntityConfiguration<InboxReview>
{
    public override void Configure(EntityTypeBuilder<InboxReview> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_reviews");

        builder.Property(e => e.ZernioReviewId).IsRequired().HasMaxLength(InboxReview.ZernioReviewIdMaxLength).HasColumnName("zernio_review_id");
        builder.Property(e => e.SocialAccountId).HasColumnName("social_account_id");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(InboxReview.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.ReviewerName).IsRequired().HasMaxLength(InboxReview.ReviewerNameMaxLength).HasColumnName("reviewer_name");
        builder.Property(e => e.ReviewerImageUrl).HasMaxLength(InboxReview.ReviewerImageUrlMaxLength).HasColumnName("reviewer_image_url");
        builder.Property(e => e.StarRating).IsRequired().HasColumnName("star_rating");
        builder.Property(e => e.ReviewText).HasMaxLength(InboxReview.ReviewTextMaxLength).HasColumnName("review_text");
        builder.Property(e => e.HasReply).HasDefaultValue(false).HasColumnName("has_reply");
        builder.Property(e => e.ReplyText).HasMaxLength(InboxReview.ReplyTextMaxLength).HasColumnName("reply_text");
        builder.Property(e => e.ReplyCreatedAtUtc).HasColumnName("reply_created_at_utc");
        builder.Property(e => e.IsRead).HasDefaultValue(false).HasColumnName("is_read");
        builder.Property(e => e.ReceivedAtUtc).IsRequired().HasColumnName("received_at_utc");
        builder.Property(e => e.ZernioAccountId).HasMaxLength(InboxReview.ZernioAccountIdMaxLength).HasColumnName("zernio_account_id");

        builder.HasOne(e => e.SocialAccount)
            .WithMany()
            .HasForeignKey(e => e.SocialAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioReviewId }).IsUnique();
        builder.HasIndex(e => new { e.WorkspaceId, e.ReceivedAtUtc }).IsDescending(false, true);
    }
}
