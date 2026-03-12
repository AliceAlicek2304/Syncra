namespace Syncra.Application.DTOs.Posts;

public record PostDto(
    Guid Id,
    Guid WorkspaceId,
    Guid UserId,
    string Title,
    string Content,
    string Status,
    DateTime? ScheduledAtUtc,
    DateTime? PublishedAtUtc,
    Guid? IntegrationId,
    IReadOnlyCollection<Guid> MediaIds
);

