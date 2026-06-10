namespace Syncra.Application.DTOs;

public sealed record ProfileDto(
    Guid Id,
    string Name,
    string ZernioProfileId,
    string? Color,
    string? AvatarUrl,
    bool IsActive,
    DateTime CreatedAtUtc);
