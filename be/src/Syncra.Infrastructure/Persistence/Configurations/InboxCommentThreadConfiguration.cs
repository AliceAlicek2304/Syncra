using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxCommentThreadConfiguration : BaseWorkspaceEntityConfiguration<InboxCommentThread>
{
    public override void Configure(EntityTypeBuilder<InboxCommentThread> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_comment_threads");

        builder.Property(e => e.ZernioPostId).IsRequired().HasMaxLength(InboxCommentThread.ZernioPostIdMaxLength).HasColumnName("zernio_post_id");
        builder.Property(e => e.PayloadJson).IsRequired().HasColumnName("payload_json");
        builder.Property(e => e.LastFetchedUtc).IsRequired().HasColumnName("last_fetched_utc");
        builder.Property(e => e.ExpiresAtUtc).IsRequired().HasColumnName("expires_at_utc");

        builder.HasOne(e => e.CommentedPost)
            .WithMany()
            .HasForeignKey(e => new { e.WorkspaceId, e.ZernioPostId })
            .HasPrincipalKey(e => new { e.WorkspaceId, e.ZernioPostId })
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioPostId }).IsUnique();
        builder.HasIndex(e => e.ExpiresAtUtc);
    }
}
