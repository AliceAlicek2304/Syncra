using MediatR;

namespace Syncra.Application.Features.Profiles.Commands;

public record DeleteProfileCommand(Guid ProfileId, Guid WorkspaceId) : IRequest;
