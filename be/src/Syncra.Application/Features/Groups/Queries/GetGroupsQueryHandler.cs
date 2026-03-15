using MediatR;
using Syncra.Application.DTOs.Groups;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Groups.Queries;

public sealed class GetGroupsQueryHandler : IRequestHandler<GetGroupsQuery, IReadOnlyList<GroupDto>>
{
    private readonly IGroupRepository _groupRepository;

    public GetGroupsQueryHandler(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public async Task<IReadOnlyList<GroupDto>> Handle(GetGroupsQuery request, CancellationToken cancellationToken)
    {
        var groups = await _groupRepository.GetByWorkspaceIdAsync(request.WorkspaceId);

        return groups.Select(g => new GroupDto(
            g.Id,
            g.WorkspaceId,
            g.Name,
            g.CreatedAtUtc,
            g.UpdatedAtUtc
        )).ToList();
    }
}
