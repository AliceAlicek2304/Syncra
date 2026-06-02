namespace Syncra.Application.DTOs.Analytics;

public record PostDebugDto(
    Guid PostId,
    Guid WorkspaceId,
    bool WorkspaceMatch,
    string Status,
    string? PublishExternalId,
    string? PublishExternalUrl);
