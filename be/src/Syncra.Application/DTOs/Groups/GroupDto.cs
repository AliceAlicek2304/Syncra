namespace Syncra.Application.DTOs.Groups;

public record GroupDto(
    Guid Id,
    Guid WorkspaceId,
    string Name,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc
);
