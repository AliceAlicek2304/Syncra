namespace Syncra.Domain.Entities;

public sealed class InboxReview : WorkspaceEntityBase
{
    public const int ZernioReviewIdMaxLength = 500;
    public const int PlatformMaxLength = 50;
    public const int ReviewerNameMaxLength = 200;
    public const int ReviewerImageUrlMaxLength = 500;
    public const int ReviewTextMaxLength = 4000;
    public const int ReplyTextMaxLength = 4000;
    public const int ZernioAccountIdMaxLength = 200;

    public string ZernioReviewId { get; private set; } = string.Empty;
    public Guid? SocialAccountId { get; private set; }
    public string Platform { get; private set; } = string.Empty;
    public string ReviewerName { get; private set; } = string.Empty;
    public string? ReviewerImageUrl { get; private set; }
    public int StarRating { get; private set; }
    public string? ReviewText { get; private set; }
    public bool HasReply { get; private set; }
    public string? ReplyText { get; private set; }
    public DateTime? ReplyCreatedAtUtc { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime ReceivedAtUtc { get; private set; }
    public string? ZernioAccountId { get; private set; }

    public SocialAccount? SocialAccount { get; set; }
    public Workspace Workspace { get; set; } = null!;

    private InboxReview() { }

    public static InboxReview Create(
        Guid workspaceId,
        string zernioReviewId,
        Guid? socialAccountId,
        string platform,
        string reviewerName,
        int starRating,
        string? reviewText,
        string? zernioAccountId = null,
        string? reviewerImageUrl = null,
        bool hasReply = false,
        string? replyText = null,
        DateTime? replyCreatedAtUtc = null,
        DateTime? receivedAtUtc = null)
    {
        var now = DateTime.UtcNow;

        return new InboxReview
        {
            WorkspaceId = workspaceId,
            ZernioReviewId = zernioReviewId,
            SocialAccountId = socialAccountId,
            Platform = platform.ToLowerInvariant(),
            ReviewerName = reviewerName,
            ReviewerImageUrl = reviewerImageUrl,
            StarRating = starRating,
            ReviewText = reviewText,
            ZernioAccountId = zernioAccountId,
            HasReply = hasReply,
            ReplyText = replyText,
            ReplyCreatedAtUtc = replyCreatedAtUtc,
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

    public void MarkReplied(string replyText)
    {
        HasReply = true;
        ReplyText = replyText;
        ReplyCreatedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateReply(string? replyText, DateTime? replyCreatedAtUtc)
    {
        HasReply = !string.IsNullOrEmpty(replyText);
        ReplyText = replyText;
        ReplyCreatedAtUtc = replyCreatedAtUtc;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateReviewerInfo(string? reviewerName, string? reviewerImageUrl)
    {
        if (!string.IsNullOrEmpty(reviewerName))
            ReviewerName = reviewerName;
        if (reviewerImageUrl != null)
            ReviewerImageUrl = reviewerImageUrl;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
