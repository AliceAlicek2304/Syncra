namespace Syncra.Domain.Entities;

public sealed class InboxConversation : WorkspaceEntityBase
{
    public const int ZernioConversationIdMaxLength = 200;
    public const int PlatformMaxLength = 50;
    public const int ParticipantNameMaxLength = 200;
    public const int ParticipantAvatarUrlMaxLength = 500;
    public const int LastMessageTextMaxLength = 2000;

    public string ZernioConversationId { get; private set; } = string.Empty;
    public Guid? SocialAccountId { get; private set; }
    public string Platform { get; private set; } = string.Empty;
    public string? ParticipantName { get; private set; }
    public string? ParticipantAvatarUrl { get; private set; }
    public string? LastMessageText { get; private set; }
    public DateTime? LastMessageAtUtc { get; private set; }
    public int UnreadCount { get; private set; }
    public bool IsRead { get; private set; }

    public SocialAccount? SocialAccount { get; set; }
    public Workspace Workspace { get; set; } = null!;

    private InboxConversation() { }

    public static InboxConversation Create(
        Guid workspaceId,
        string zernioConversationId,
        Guid? socialAccountId,
        string platform,
        string? participantName = null,
        string? participantAvatarUrl = null,
        string? lastMessageText = null,
        DateTime? lastMessageAtUtc = null)
    {
        var now = DateTime.UtcNow;

        return new InboxConversation
        {
            WorkspaceId = workspaceId,
            ZernioConversationId = zernioConversationId,
            SocialAccountId = socialAccountId,
            Platform = platform.ToLowerInvariant(),
            ParticipantName = participantName,
            ParticipantAvatarUrl = participantAvatarUrl,
            LastMessageText = lastMessageText,
            LastMessageAtUtc = lastMessageAtUtc,
            UnreadCount = 0,
            IsRead = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void MarkRead()
    {
        IsRead = true;
        UnreadCount = 0;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void IncrementUnread()
    {
        UnreadCount++;
        IsRead = false;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateLastMessage(string? text, DateTime? sentAtUtc)
    {
        LastMessageText = text;
        LastMessageAtUtc = sentAtUtc;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateParticipant(string? participantName, string? participantAvatarUrl)
    {
        ParticipantName = participantName;
        ParticipantAvatarUrl = participantAvatarUrl;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
