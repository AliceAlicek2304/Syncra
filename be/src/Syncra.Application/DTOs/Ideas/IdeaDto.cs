namespace Syncra.Application.DTOs.Ideas;

public record IdeaDto(
    Guid Id,
    Guid WorkspaceId,
    string Title,
    string? Description,
    string Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc
);