using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class Post : WorkspaceEntityBase
{
    public const int PublishLastErrorMaxLength = 500;

    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? ScheduledAtUtc { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public PostStatus Status { get; set; } = PostStatus.Draft;

    public Guid? IntegrationId { get; set; }

    public string? PublishExternalId { get; private set; }
    public string? PublishExternalUrl { get; private set; }
    public DateTime? PublishLastAttemptAtUtc { get; private set; }
    public string? PublishLastError { get; private set; }
    public string? PublishProviderResponseMetadata { get; private set; }

    public Workspace Workspace { get; set; } = null!;
    public User User { get; set; } = null!;
    public Integration? Integration { get; set; }
    public ICollection<Media> Media { get; set; } = new List<Media>();

    public void MarkPublishAttempt(
        DateTime utcNow,
        string? externalId = null,
        string? externalUrl = null,
        string? providerResponseMetadata = null)
    {
        PublishLastAttemptAtUtc = utcNow;
        if (!string.IsNullOrWhiteSpace(externalId))
        {
            PublishExternalId = externalId;
        }

        if (!string.IsNullOrWhiteSpace(externalUrl))
        {
            PublishExternalUrl = externalUrl;
        }

        if (!string.IsNullOrWhiteSpace(providerResponseMetadata))
        {
            PublishProviderResponseMetadata = providerResponseMetadata;
        }
    }

    public void MarkPublishSuccess(
        DateTime utcNow,
        string? externalId,
        string? externalUrl,
        string? providerResponseMetadata = null)
    {
        PublishLastAttemptAtUtc = utcNow;
        PublishExternalId = externalId;
        PublishExternalUrl = externalUrl;
        PublishLastError = null;
        PublishProviderResponseMetadata = providerResponseMetadata;
        Status = PostStatus.Published;
        PublishedAtUtc ??= utcNow;
    }

    public void MarkPublishFailure(
        DateTime utcNow,
        string? error,
        string? providerResponseMetadata = null)
    {
        PublishLastAttemptAtUtc = utcNow;
        PublishLastError = TruncateError(error);
        PublishProviderResponseMetadata = providerResponseMetadata ?? PublishProviderResponseMetadata;
        Status = PostStatus.Failed;
    }

    private static string? TruncateError(string? error)
    {
        if (string.IsNullOrWhiteSpace(error))
        {
            return null;
        }

        return error.Length <= PublishLastErrorMaxLength
            ? error
            : error[..PublishLastErrorMaxLength];
    }
}

