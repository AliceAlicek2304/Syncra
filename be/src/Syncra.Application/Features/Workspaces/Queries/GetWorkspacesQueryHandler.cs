using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Workspaces.Queries;

public sealed class GetWorkspacesQueryHandler : IRequestHandler<GetWorkspacesQuery, IReadOnlyList<WorkspaceDto>>
{
    private readonly IWorkspaceRepository _workspaceRepository;

    public GetWorkspacesQueryHandler(IWorkspaceRepository workspaceRepository)
    {
        _workspaceRepository = workspaceRepository;
    }

    public async Task<IReadOnlyList<WorkspaceDto>> Handle(GetWorkspacesQuery request, CancellationToken cancellationToken)
    {
        var workspaces = await _workspaceRepository.GetByUserIdAsync(request.UserId);
        return workspaces.Select(w => new WorkspaceDto(w.Id, w.Name.Value, w.Slug.Value, w.OwnerUserId, w.CreatedAtUtc)).ToList();
    }
}