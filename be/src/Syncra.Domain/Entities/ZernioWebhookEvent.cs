using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class ZernioWebhookEvent : WorkspaceEntityBase
{
    public const int EventTypeMaxLength = 100;
    public const int ErrorMessageMaxLength = 500;

    public string EventType { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public WebhookEventStatus Status { get; private set; } = WebhookEventStatus.Pending;
    public string? ErrorMessage { get; private set; }
    public DateTime? ProcessedAtUtc { get; private set; }
    public Guid? PostId { get; private set; }

    public Post? Post { get; set; }
    public Workspace Workspace { get; set; } = null!;

    private ZernioWebhookEvent() { }

    public static ZernioWebhookEvent Create(
        Guid workspaceId,
        string eventType,
        string payload,
        Guid? postId = null)
    {
        var now = DateTime.UtcNow;

        return new ZernioWebhookEvent
        {
            WorkspaceId = workspaceId,
            EventType = eventType,
            Payload = payload,
            Status = WebhookEventStatus.Pending,
            PostId = postId,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void MarkProcessed(DateTime utcNow)
    {
        Status = WebhookEventStatus.Processed;
        ProcessedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public void MarkFailed(string error, DateTime utcNow)
    {
        Status = WebhookEventStatus.Failed;
        ErrorMessage = error.Length > ErrorMessageMaxLength ? error[..ErrorMessageMaxLength] : error;
        ProcessedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }
}
