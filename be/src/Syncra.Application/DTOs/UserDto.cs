namespace Syncra.Application.DTOs;

public record ZernioProfileBriefDto(
    Guid Id,
    string ZernioProfileId,
    string DisplayName,
    string Platform,
    string? AvatarUrl,
    bool IsActive
);

public record CurrentUserWorkspaceDto(
    Guid Id,
    string Name,
    string Slug,
    string? Color,
    string? Description,
    string Role,
    string Status,
    IReadOnlyList<ZernioProfileBriefDto> ZernioProfiles
);

public record UserDto(
    Guid Id,
    string Email,
    bool HasPasswordBeenSet,
    UserProfileDto? Profile,
    CurrentUserWorkspaceDto? Workspace,
    string? StudentEmail,
    DateTime? StudentEmailVerifiedAtUtc,
    DateTime? StudentVerificationExpiresAtUtc,
    bool HasValidStudentVerification
);
