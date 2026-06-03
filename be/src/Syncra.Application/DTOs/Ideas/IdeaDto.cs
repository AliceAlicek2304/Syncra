namespace Syncra.Application.DTOs.Ideas;

public record IdeaDto(
    Guid Id,
    Guid WorkspaceId,
    string Title,
    string? Description,
    string Status,
    int Position,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc
);