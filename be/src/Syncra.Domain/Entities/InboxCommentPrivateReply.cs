using System;

namespace Syncra.Domain.Entities;

public sealed class InboxCommentPrivateReply : WorkspaceEntityBase
{
    public const int ZernioCommentIdMaxLength = 200;

    public string ZernioCommentId { get; private set; } = string.Empty;
    public DateTime SentAtUtc { get; private set; }

    public Workspace Workspace { get; set; } = null!;

    private InboxCommentPrivateReply() { }

    public static InboxCommentPrivateReply Create(
        Guid workspaceId,
        string zernioCommentId,
        DateTime? sentAtUtc = null)
    {
        return new InboxCommentPrivateReply
        {
            WorkspaceId = workspaceId,
            ZernioCommentId = zernioCommentId,
            SentAtUtc = sentAtUtc ?? DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }
}
