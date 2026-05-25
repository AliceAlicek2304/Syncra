using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Workspaces.Commands;

public record UpdateWorkspaceCommand(
    Guid WorkspaceId,
    Guid UserId,
    string Name,
    string? Description = null,
    string? Color = null) : IRequest<WorkspaceDto>;
