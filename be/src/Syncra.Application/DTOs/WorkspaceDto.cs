namespace Syncra.Application.DTOs;

public record WorkspaceDto(
    Guid Id,
    string Name,
    string Slug,
    Guid OwnerUserId,
    DateTime CreatedAtUtc
);
