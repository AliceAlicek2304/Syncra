using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Profiles.Commands;

public record CreateProfileCommand(
    Guid WorkspaceId,
    string Name,
    string? Color = null
) : IRequest<ProfileDto>;
