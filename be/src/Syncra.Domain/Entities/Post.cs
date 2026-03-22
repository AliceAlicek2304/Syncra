using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.ValueObjects;

namespace Syncra.Domain.Entities;

public sealed class Post : WorkspaceEntityBase
{
    public const int PublishLastErrorMaxLength = 500;

    // Value Objects - with private setters for encapsulation
    public PostTitle Title { get; private set; } = PostTitle.Empty;
    public PostContent Content { get; private set; } = PostContent.Empty;
    public ScheduledTime ScheduledAt { get; private set; } = ScheduledTime.None;

    // Primitive properties - still with private setters
    public Guid UserId { get; private set; }
    public DateTime? PublishedAtUtc { get; private set; }
    public PostStatus Status { get; private set; } = PostStatus.Draft;

    public Guid? IntegrationId { get; private set; }

    // Publishing result
    public string? PublishExternalId { get; private set; }
    public string? PublishExternalUrl { get; private set; }
    public DateTime? PublishLastAttemptAtUtc { get; private set; }
    public string? PublishLastError { get; private set; }
    public string? PublishProviderResponseMetadata { get; private set; }

    // Navigation properties
    public Workspace Workspace { get; set; } = null!;
    public User User { get; set; } = null!;
    public Integration? Integration { get; set; }
    public ICollection<Media> Media { get; set; } = new List<Media>();

    // Private parameterless constructor for EF Core
    private Post() { }

    // Factory method - Create a new post in Draft status
    public static Post Create(
        Guid workspaceId,
        Guid userId,
        string title,
        string content,
        DateTime? scheduledAtUtc = null,
        Guid? integrationId = null)
    {
        var now = DateTime.UtcNow;
        var scheduledTime = ScheduledTime.Create(scheduledAtUtc);

        var status = scheduledTime.IsInFuture
            ? PostStatus.Scheduled
            : PostStatus.Draft;

        return new Post
        {
            WorkspaceId = workspaceId,
            UserId = userId,
            Title = PostTitle.Create(title),
            Content = PostContent.Create(content),
            ScheduledAt = scheduledTime,
            Status = status,
            IntegrationId = integrationId,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors - mutation methods

    public void UpdateContent(string title, string content)
    {
        if (Status is PostStatus.Published or PostStatus.Publishing)
        {
            throw new DomainException(
                "invalid_state",
                "Cannot update content of a published or publishing post.");
        }

        Title = PostTitle.Create(title);
        Content = PostContent.Create(content);
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Schedule(DateTime scheduledAtUtc)
    {
        var scheduledTime = ScheduledTime.Create(scheduledAtUtc);

        if (!scheduledTime.IsInFuture)
        {
            throw new DomainException(
                "invalid_schedule",
                "Scheduled time must be in the future.");
        }

        if (Status == PostStatus.Published)
        {
            throw new DomainException(
                "invalid_state",
                "Cannot schedule a published post.");
        }

        ScheduledAt = scheduledTime;
        Status = PostStatus.Scheduled;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Unschedule()
    {
        if (Status != PostStatus.Scheduled)
        {
            throw new DomainException(
                "invalid_state",
                "Only scheduled posts can be unscheduled.");
        }

        ScheduledAt = ScheduledTime.None;
        Status = PostStatus.Draft;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void SetIntegration(Guid? integrationId)
    {
        if (Status == PostStatus.Published)
        {
            throw new DomainException(
                "invalid_state",
                "Cannot change integration of a published post.");
        }

        IntegrationId = integrationId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void AddMedia(Media media)
    {
        if (Status == PostStatus.Published)
        {
            throw new DomainException(
                "invalid_state",
                "Cannot add media to a published post.");
        }

        if (media.WorkspaceId != WorkspaceId)
        {
            throw new DomainException(
                "invalid_media",
                "Media must belong to the same workspace.");
        }

        if (media.PostId.HasValue && media.PostId != Id)
        {
            throw new DomainException(
                "invalid_media",
                "Media is already attached to another post.");
        }

        if (!Media.Contains(media))
        {
            Media.Add(media);
            UpdatedAtUtc = DateTime.UtcNow;
        }
    }

    public void RemoveMedia(Media media)
    {
        if (Status == PostStatus.Published)
        {
            throw new DomainException(
                "invalid_state",
                "Cannot remove media from a published post.");
        }

        if (Media.Contains(media))
        {
            Media.Remove(media);
            UpdatedAtUtc = DateTime.UtcNow;
        }
    }

    public void ClearMedia()
    {
        if (Status == PostStatus.Published)
        {
            throw new DomainException(
                "invalid_state",
                "Cannot clear media from a published post.");
        }

        Media.Clear();
        UpdatedAtUtc = DateTime.UtcNow;
    }

    // Publishing-related methods

    public bool CanBePublished()
    {
        return Status is PostStatus.Draft or PostStatus.Scheduled or PostStatus.Publishing
            && IntegrationId.HasValue
            && ScheduledAt is not null
            && !ScheduledAt.IsInFuture;
    }

    public bool CanTransitionTo(PostStatus requestedStatus)
    {
        return PostStatusTransitions.CanTransition(Status, requestedStatus);
    }

    public void TransitionTo(PostStatus newStatus)
    {
        if (!CanTransitionTo(newStatus))
        {
            throw new DomainException(
                "invalid_status_transition",
                $"Cannot transition from {Status} to {newStatus}.");
        }

        Status = newStatus;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkPublishAttempt(DateTime utcNow)
    {
        if (Status != PostStatus.Publishing)
        {
            Status = PostStatus.Publishing;
        }

        PublishLastAttemptAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public void MarkPublishSuccess(
        DateTime utcNow,
        string? externalId,
        string? externalUrl,
        string? providerResponseMetadata = null)
    {
        if (!CanBePublished())
        {
            throw new DomainException(
                "invalid_state",
                "Post cannot be marked as published.");
        }

        PublishLastAttemptAtUtc = utcNow;
        PublishExternalId = externalId;
        PublishExternalUrl = externalUrl;
        PublishLastError = null;
        PublishProviderResponseMetadata = TruncateMetadata(providerResponseMetadata);
        Status = PostStatus.Published;
        PublishedAtUtc ??= utcNow;
        UpdatedAtUtc = utcNow;
    }

    public void MarkPublishFailure(
        DateTime utcNow,
        string? error,
        string? providerResponseMetadata = null)
    {
        if (Status != PostStatus.Publishing)
        {
            throw new DomainException(
                "invalid_state",
                "Only publishing posts can be marked as failed.");
        }

        PublishLastAttemptAtUtc = utcNow;
        PublishLastError = TruncateError(error);
        PublishProviderResponseMetadata = TruncateMetadata(providerResponseMetadata ?? PublishProviderResponseMetadata);
        Status = PostStatus.Failed;
        UpdatedAtUtc = utcNow;
    }

    public void Retry()
    {
        if (Status != PostStatus.Failed)
        {
            throw new DomainException(
                "invalid_state",
                "Only failed posts can be retried.");
        }

        if (!IntegrationId.HasValue)
        {
            throw new DomainException(
                "missing_integration",
                "Cannot retry a post without an integration.");
        }

        Status = PostStatus.Draft;
        PublishLastError = null;
        UpdatedAtUtc = DateTime.UtcNow;
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

    private static string? TruncateMetadata(string? metadata)
    {
        if (string.IsNullOrWhiteSpace(metadata))
        {
            return null;
        }

        // Truncate to same length as error for consistency
        return metadata.Length <= PublishLastErrorMaxLength
            ? metadata
            : metadata[..PublishLastErrorMaxLength];
    }
}