namespace Syncra.Domain.Entities;

public sealed class InboxMessage : WorkspaceEntityBase
{
    public const int ZernioMessageIdMaxLength = 200;
    public const int DirectionMaxLength = 20;
    public const int BodyTextMaxLength = 4000;
    public const int ZernioAccountIdMaxLength = 200;

    public Guid InboxConversationId { get; private set; }
    public string ZernioMessageId { get; private set; } = string.Empty;
    public string Direction { get; private set; } = string.Empty; // "Inbound" / "Outbound"
    public string? BodyText { get; private set; }
    public DateTime SentAtUtc { get; private set; }
    public string? ZernioAccountId { get; private set; }

    public InboxConversation InboxConversation { get; set; } = null!;

    private InboxMessage() { }

    public static InboxMessage Create(
        Guid workspaceId,
        Guid inboxConversationId,
        string zernioMessageId,
        string direction,
        string? bodyText,
        DateTime sentAtUtc,
        string? zernioAccountId = null)
    {
        var now = DateTime.UtcNow;

        return new InboxMessage
        {
            WorkspaceId = workspaceId,
            InboxConversationId = inboxConversationId,
            ZernioMessageId = zernioMessageId,
            Direction = direction,
            BodyText = bodyText,
            SentAtUtc = sentAtUtc,
            ZernioAccountId = zernioAccountId,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void UpdateBodyText(string text)
    {
        BodyText = text;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
