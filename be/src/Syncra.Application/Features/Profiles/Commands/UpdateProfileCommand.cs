using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Profiles.Commands;

public record UpdateProfileCommand(
    Guid ProfileId,
    Guid WorkspaceId,
    Guid UserId,
    string Name
) : IRequest<ProfileDto>;
