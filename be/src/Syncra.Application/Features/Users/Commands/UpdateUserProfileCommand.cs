using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Users.Commands;

public record UpdateUserProfileCommand(
    Guid UserId,
    string? DisplayName,
    string? FirstName,
    string? LastName,
    string? Timezone,
    string? Locale) : IRequest<UserProfileDto>;
