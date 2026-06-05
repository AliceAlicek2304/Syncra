using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxCommentPrivateReplyConfiguration : BaseWorkspaceEntityConfiguration<InboxCommentPrivateReply>
{
    public override void Configure(EntityTypeBuilder<InboxCommentPrivateReply> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_comment_private_replies");

        builder.Property(e => e.ZernioCommentId)
            .IsRequired()
            .HasMaxLength(InboxCommentPrivateReply.ZernioCommentIdMaxLength)
            .HasColumnName("zernio_comment_id");

        builder.Property(e => e.SentAtUtc)
            .IsRequired()
            .HasColumnName("sent_at_utc");

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioCommentId }).IsUnique();
    }
}
