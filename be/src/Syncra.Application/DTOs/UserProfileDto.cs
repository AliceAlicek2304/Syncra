namespace Syncra.Application.DTOs;

public record UserProfileDto(
    Guid UserId,
    string Email,
    string? DisplayName,
    string? FirstName,
    string? LastName,
    string? AvatarUrl,
    string? Timezone,
    string? Locale);
