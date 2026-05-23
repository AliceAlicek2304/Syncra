using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class PostPlatformTarget : WorkspaceEntityBase
{
    public const int PlatformMaxLength = 50;
    public const int ExternalPostIdMaxLength = 500;
    public const int ErrorMessageMaxLength = 1000;
    public const int ZernioAccountIdMaxLength = 200;

    public string Platform { get; private set; } = string.Empty;
    public PostPlatformStatus Status { get; private set; } = PostPlatformStatus.Pending;
    public string? ExternalPostId { get; private set; }
    public string? ExternalPostUrl { get; private set; }
    public string? ErrorMessage { get; private set; }
    public string? ZernioAccountId { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTime? LastAttemptAtUtc { get; private set; }

    public Guid PostId { get; private set; }
    public Post Post { get; set; } = null!;
    public Workspace Workspace { get; set; } = null!;

    private PostPlatformTarget() { }

    public static PostPlatformTarget Create(
        Guid workspaceId,
        Guid postId,
        string platform)
    {
        var now = DateTime.UtcNow;

        return new PostPlatformTarget
        {
            WorkspaceId = workspaceId,
            PostId = postId,
            Platform = platform.ToLowerInvariant(),
            Status = PostPlatformStatus.Pending,
            AttemptCount = 0,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void MarkPublished(string externalPostId, string? externalPostUrl, DateTime utcNow)
    {
        Status = PostPlatformStatus.Published;
        ExternalPostId = externalPostId;
        ExternalPostUrl = externalPostUrl;
        LastAttemptAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public void MarkFailed(string error, DateTime utcNow)
    {
        Status = PostPlatformStatus.Failed;
        ErrorMessage = error.Length > ErrorMessageMaxLength ? error[..ErrorMessageMaxLength] : error;
        LastAttemptAtUtc = utcNow;
        AttemptCount++;
        UpdatedAtUtc = utcNow;
    }

    public void SetZernioAccountId(string accountId)
    {
        ZernioAccountId = accountId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void ResetForRetry()
    {
        Status = PostPlatformStatus.Pending;
        ErrorMessage = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool CanRetry => Status is PostPlatformStatus.Failed;
}
