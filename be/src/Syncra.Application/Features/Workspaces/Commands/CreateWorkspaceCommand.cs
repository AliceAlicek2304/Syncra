using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Workspaces.Commands;

public record CreateWorkspaceCommand(
    Guid UserId,
    string Name
) : IRequest<WorkspaceDto>;