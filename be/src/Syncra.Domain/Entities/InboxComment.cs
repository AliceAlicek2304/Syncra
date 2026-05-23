namespace Syncra.Domain.Entities;

public sealed class InboxComment : WorkspaceEntityBase
{
    public const int ZernioCommentIdMaxLength = 200;
    public const int PlatformMaxLength = 50;
    public const int AuthorNameMaxLength = 200;
    public const int AuthorUsernameMaxLength = 200;
    public const int AuthorPictureMaxLength = 500;
    public const int BodyTextMaxLength = 4000;
    public const int ZernioPostIdMaxLength = 200;
    public const int ZernioAccountIdMaxLength = 200;
    public const int PostPreviewCaptionMaxLength = 500;
    public const int PostPreviewThumbnailUrlMaxLength = 500;
    public const int ParentCommentIdMaxLength = 200;

    public string ZernioCommentId { get; private set; } = string.Empty;
    public Guid? SocialAccountId { get; private set; }
    public string Platform { get; private set; } = string.Empty;
    public string AuthorName { get; private set; } = string.Empty;
    public string? AuthorUsername { get; private set; }
    public string? AuthorPicture { get; private set; }
    public string BodyText { get; private set; } = string.Empty;
    public string? ZernioPostId { get; private set; }
    public string? ZernioAccountId { get; private set; }
    public string? PostPreviewCaption { get; private set; }
    public string? PostPreviewThumbnailUrl { get; private set; }
    public string? ParentCommentId { get; private set; }
    public bool IsReply { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime ReceivedAtUtc { get; private set; }

    public SocialAccount? SocialAccount { get; set; }
    public Workspace Workspace { get; set; } = null!;

    private InboxComment() { }

    public static InboxComment Create(
        Guid workspaceId,
        string zernioCommentId,
        Guid? socialAccountId,
        string platform,
        string authorName,
        string bodyText,
        string? zernioPostId = null,
        string? zernioAccountId = null,
        string? authorUsername = null,
        string? authorPicture = null,
        string? postPreviewCaption = null,
        string? postPreviewThumbnailUrl = null,
        string? parentCommentId = null,
        bool isReply = false,
        DateTime? receivedAtUtc = null)
    {
        var now = DateTime.UtcNow;

        return new InboxComment
        {
            WorkspaceId = workspaceId,
            ZernioCommentId = zernioCommentId,
            SocialAccountId = socialAccountId,
            Platform = platform.ToLowerInvariant(),
            AuthorName = authorName,
            AuthorUsername = authorUsername,
            AuthorPicture = authorPicture,
            BodyText = bodyText,
            ZernioPostId = zernioPostId,
            ZernioAccountId = zernioAccountId,
            PostPreviewCaption = postPreviewCaption,
            PostPreviewThumbnailUrl = postPreviewThumbnailUrl,
            ParentCommentId = parentCommentId,
            IsReply = isReply,
            IsRead = false,
            ReceivedAtUtc = receivedAtUtc ?? now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void MarkRead()
    {
        IsRead = true;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdatePostPreview(string? caption, string? thumbnailUrl)
    {
        PostPreviewCaption = caption;
        PostPreviewThumbnailUrl = thumbnailUrl;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
