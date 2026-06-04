namespace Syncra.Domain.Entities;

public sealed class InboxCommentThread : WorkspaceEntityBase
{
    public const int ZernioPostIdMaxLength = 200;
    public const int PayloadJsonMaxLength = int.MaxValue;

    public string ZernioPostId { get; private set; } = string.Empty;
    public string PayloadJson { get; private set; } = "[]";
    public DateTime LastFetchedUtc { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }

    public InboxCommentedPost? CommentedPost { get; set; }
    public Workspace Workspace { get; set; } = null!;

    private InboxCommentThread() { }

    public static InboxCommentThread Create(
        Guid workspaceId,
        string zernioPostId,
        string payloadJson,
        DateTime? expiresAtUtc = null,
        DateTime? lastFetchedUtc = null)
    {
        var now = DateTime.UtcNow;

        return new InboxCommentThread
        {
            WorkspaceId = workspaceId,
            ZernioPostId = zernioPostId,
            PayloadJson = payloadJson,
            LastFetchedUtc = lastFetchedUtc ?? now,
            ExpiresAtUtc = expiresAtUtc ?? now.AddMinutes(15),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void Refresh(string payloadJson, DateTime? expiresAtUtc = null)
    {
        var now = DateTime.UtcNow;
        PayloadJson = payloadJson;
        LastFetchedUtc = now;
        ExpiresAtUtc = expiresAtUtc ?? now.AddMinutes(15);
        UpdatedAtUtc = now;
    }
}
