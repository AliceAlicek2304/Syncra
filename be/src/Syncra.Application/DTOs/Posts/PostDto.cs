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
    IReadOnlyCollection<Guid> MediaIds,
    IReadOnlyList<PostMediaItemDto>? MediaItems,
    string? ZernioPostId,
    int ZernioTargetCount,
    IReadOnlyList<PostPlatformTargetDto> PlatformTargets
);

public record PostMediaItemDto(
    string Url,
    string Type,
    string? Filename,
    string? MimeType);

public record PostPlatformTargetDto(
    Guid Id,
    string Platform,
    string Status,
    string? ExternalPostUrl,
    string? ErrorMessage,
    string? ZernioAccountId,
    System.Text.Json.Nodes.JsonNode? PlatformSpecificData = null
);
