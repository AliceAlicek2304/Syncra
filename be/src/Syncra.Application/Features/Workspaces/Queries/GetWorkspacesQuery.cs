using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Workspaces.Queries;

public record GetWorkspacesQuery(Guid UserId) : IRequest<IReadOnlyList<WorkspaceDto>>;