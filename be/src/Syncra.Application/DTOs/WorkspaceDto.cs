namespace Syncra.Application.DTOs;

public record WorkspaceDto(
    Guid Id,
    string Name,
    string Slug,
    Guid OwnerUserId,
    DateTime CreatedAtUtc,
    string? ZernioProfileId = null,
    string? Color = null,
    string? Description = null,
    IReadOnlyList<string> ZernioProfileIds = null!
);
