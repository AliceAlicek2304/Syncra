using MediatR;
using Syncra.Application.DTOs.Groups;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Groups.Queries;

public sealed class GetGroupByIdQueryHandler : IRequestHandler<GetGroupByIdQuery, GroupDto?>
{
    private readonly IGroupRepository _groupRepository;

    public GetGroupByIdQueryHandler(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public async Task<GroupDto?> Handle(GetGroupByIdQuery request, CancellationToken cancellationToken)
    {
        var group = await _groupRepository.GetByIdAsync(request.GroupId, request.WorkspaceId);

        if (group is null)
        {
            return null;
        }

        return new GroupDto(
            group.Id,
            group.WorkspaceId,
            group.Name,
            group.CreatedAtUtc,
            group.UpdatedAtUtc
        );
    }
}
