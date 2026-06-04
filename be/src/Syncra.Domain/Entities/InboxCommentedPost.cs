namespace Syncra.Domain.Entities;

public sealed class InboxCommentedPost : WorkspaceEntityBase
{
    public const int ZernioPostIdMaxLength = 200;
    public const int PlatformMaxLength = 50;
    public const int ZernioAccountIdMaxLength = 200;
    public const int PostPreviewCaptionMaxLength = 500;
    public const int PostPreviewThumbnailUrlMaxLength = 2048;
    public const int ZernioTopCommentIdMaxLength = 200;
    public const int AccountUsernameMaxLength = 200;
    public const int SubredditMaxLength = 200;
    public const int AdIdMaxLength = 200;
    public const int PlacementMaxLength = 50;
    public const int PermalinkMaxLength = 1000;

    public string ZernioPostId { get; private set; } = string.Empty;
    public Guid? SocialAccountId { get; private set; }
    public string Platform { get; private set; } = string.Empty;
    public string? ZernioAccountId { get; private set; }
    public string? AccountUsername { get; private set; }
    public string? PostPreviewCaption { get; private set; }
    public string? PostPreviewThumbnailUrl { get; private set; }
    public int CommentCount { get; private set; }
    public string? ZernioTopCommentId { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime ReceivedAtUtc { get; private set; }
    public int? LikeCount { get; private set; }
    public string? Subreddit { get; private set; }
    public bool? IsAd { get; private set; }
    public string? AdId { get; private set; }
    public string? Placement { get; private set; }
    public string? Permalink { get; private set; }

    public SocialAccount? SocialAccount { get; set; }
    public Workspace Workspace { get; set; } = null!;

    private InboxCommentedPost() { }

    public static InboxCommentedPost Create(
        Guid workspaceId,
        string zernioPostId,
        Guid? socialAccountId,
        string platform,
        string? zernioAccountId = null,
        string? accountUsername = null,
        string? postPreviewCaption = null,
        string? postPreviewThumbnailUrl = null,
        int commentCount = 0,
        string? zernioTopCommentId = null,
        DateTime? receivedAtUtc = null,
        int? likeCount = null,
        string? subreddit = null,
        bool? isAd = null,
        string? adId = null,
        string? placement = null,
        string? permalink = null)
    {
        var now = DateTime.UtcNow;

        return new InboxCommentedPost
        {
            WorkspaceId = workspaceId,
            ZernioPostId = zernioPostId,
            SocialAccountId = socialAccountId,
            Platform = platform.ToLowerInvariant(),
            ZernioAccountId = zernioAccountId,
            AccountUsername = accountUsername,
            PostPreviewCaption = postPreviewCaption,
            PostPreviewThumbnailUrl = postPreviewThumbnailUrl,
            CommentCount = commentCount,
            ZernioTopCommentId = zernioTopCommentId,
            IsRead = false,
            ReceivedAtUtc = receivedAtUtc ?? now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            LikeCount = likeCount,
            Subreddit = subreddit,
            IsAd = isAd,
            AdId = adId,
            Placement = placement,
            Permalink = permalink
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

    public void SetZernioAccountId(string? accountId)
    {
        ZernioAccountId = accountId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void SetTopCommentId(string? topCommentId)
    {
        ZernioTopCommentId = topCommentId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void IncrementCommentCount()
    {
        CommentCount += 1;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateCommentedPostFields(
        string? accountUsername,
        int? likeCount,
        string? subreddit,
        bool? isAd,
        string? adId,
        string? placement,
        string? permalink,
        int commentCount,
        string? postPreviewThumbnailUrl = null,
        string? postPreviewCaption = null)
    {
        AccountUsername = accountUsername;
        LikeCount = likeCount;
        Subreddit = subreddit;
        IsAd = isAd;
        AdId = adId;
        Placement = placement;
        Permalink = permalink;
        CommentCount = commentCount;
        if (postPreviewThumbnailUrl != null)
        {
            PostPreviewThumbnailUrl = postPreviewThumbnailUrl;
        }
        if (postPreviewCaption != null)
        {
            PostPreviewCaption = postPreviewCaption;
        }
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
