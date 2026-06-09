using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Workspaces.Queries;

public sealed class GetWorkspacesQueryHandler : IRequestHandler<GetWorkspacesQuery, IReadOnlyList<WorkspaceDto>>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;

    public GetWorkspacesQueryHandler(
        IWorkspaceRepository workspaceRepository,
        IZernioProfileRepository zernioProfileRepository)
    {
        _workspaceRepository = workspaceRepository;
        _zernioProfileRepository = zernioProfileRepository;
    }

    public async Task<IReadOnlyList<WorkspaceDto>> Handle(GetWorkspacesQuery request, CancellationToken cancellationToken)
    {
        var workspaces = await _workspaceRepository.GetByUserIdAsync(request.UserId);
        var workspaceList = workspaces.ToList();

        var workspaceIds = workspaceList.Select(w => w.Id).ToList();
        var profiles = await _zernioProfileRepository.GetByWorkspaceIdsAsync(workspaceIds);
        var profileLookup = profiles
            .GroupBy(p => p.WorkspaceId)
            .ToDictionary(g => g.Key, g => g.First().ZernioProfileId);

        return workspaceList.Select(w => new WorkspaceDto(
            w.Id,
            w.Name.Value,
            w.Slug.Value,
            w.OwnerUserId,
            w.CreatedAtUtc,
            ZernioProfileId: profileLookup.GetValueOrDefault(w.Id),
            Color: w.Color,
            Description: w.Description)).ToList();
    }
}
