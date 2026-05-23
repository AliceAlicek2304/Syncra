using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class InboxMessageConfiguration : BaseWorkspaceEntityConfiguration<InboxMessage>
{
    public override void Configure(EntityTypeBuilder<InboxMessage> builder)
    {
        base.Configure(builder);
        builder.ToTable("inbox_messages");

        builder.Property(e => e.InboxConversationId).IsRequired().HasColumnName("inbox_conversation_id");
        builder.Property(e => e.ZernioMessageId).IsRequired().HasMaxLength(InboxMessage.ZernioMessageIdMaxLength).HasColumnName("zernio_message_id");
        builder.Property(e => e.Direction).IsRequired().HasMaxLength(InboxMessage.DirectionMaxLength).HasColumnName("direction");
        builder.Property(e => e.BodyText).HasMaxLength(InboxMessage.BodyTextMaxLength).HasColumnName("body_text");
        builder.Property(e => e.SentAtUtc).IsRequired().HasColumnName("sent_at_utc");
        builder.Property(e => e.ZernioAccountId).HasMaxLength(InboxMessage.ZernioAccountIdMaxLength).HasColumnName("zernio_account_id");

        builder.HasOne(e => e.InboxConversation)
            .WithMany()
            .HasForeignKey(e => e.InboxConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.ZernioMessageId }).IsUnique();
        builder.HasIndex(e => new { e.InboxConversationId, e.SentAtUtc });
    }
}
