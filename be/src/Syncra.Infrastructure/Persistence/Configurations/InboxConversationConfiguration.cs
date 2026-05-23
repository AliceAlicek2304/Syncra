using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxConversationConfiguration : BaseWorkspaceEntityConfiguration<InboxConversation>
{
    public override void Configure(EntityTypeBuilder<InboxConversation> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_conversations");

        builder.Property(e => e.ZernioConversationId).IsRequired().HasMaxLength(InboxConversation.ZernioConversationIdMaxLength).HasColumnName("zernio_conversation_id");
        builder.Property(e => e.SocialAccountId).HasColumnName("social_account_id");
        builder.Property(e => e.Platform).IsRequired().HasMaxLength(InboxConversation.PlatformMaxLength).HasColumnName("platform");
        builder.Property(e => e.ParticipantName).HasMaxLength(InboxConversation.ParticipantNameMaxLength).HasColumnName("participant_name");
        builder.Property(e => e.ParticipantAvatarUrl).HasMaxLength(InboxConversation.ParticipantAvatarUrlMaxLength).HasColumnName("participant_avatar_url");
        builder.Property(e => e.LastMessageText).HasMaxLength(InboxConversation.LastMessageTextMaxLength).HasColumnName("last_message_text");
        builder.Property(e => e.LastMessageAtUtc).HasColumnName("last_message_at_utc");
        builder.Property(e => e.UnreadCount).HasDefaultValue(0).HasColumnName("unread_count");
        builder.Property(e => e.IsRead).HasDefaultValue(true).HasColumnName("is_read");

        builder.HasOne(e => e.SocialAccount)
            .WithMany()
            .HasForeignKey(e => e.SocialAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Workspace)
            .WithMany()
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioConversationId }).IsUnique();
        builder.HasIndex(e => new { e.WorkspaceId, e.LastMessageAtUtc }).IsDescending(false, true);
    }
}
