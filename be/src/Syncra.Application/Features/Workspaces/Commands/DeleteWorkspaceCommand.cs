using MediatR;

namespace Syncra.Application.Features.Workspaces.Commands;

public record DeleteWorkspaceCommand(
    Guid WorkspaceId,
    Guid UserId
) : IRequest;
