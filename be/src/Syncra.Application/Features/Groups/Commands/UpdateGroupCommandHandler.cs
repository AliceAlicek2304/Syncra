using MediatR;
using Syncra.Application.DTOs.Groups;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Groups.Commands;

public sealed class UpdateGroupCommandHandler : IRequestHandler<UpdateGroupCommand, GroupDto?>
{
    private readonly IGroupRepository _groupRepository;
    private readonly IIdeaRepository _ideaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateGroupCommandHandler(IGroupRepository groupRepository, IIdeaRepository ideaRepository, IUnitOfWork unitOfWork)
    {
        _groupRepository = groupRepository;
        _ideaRepository = ideaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<GroupDto?> Handle(UpdateGroupCommand request, CancellationToken cancellationToken)
    {
        var group = await _groupRepository.GetByIdAsync(request.GroupId, request.WorkspaceId);

        if (group is null)
        {
            return null;
        }

        var exists = await _groupRepository.ExistsWithNameAsync(request.WorkspaceId, request.Name, request.GroupId);
        if (exists)
        {
            throw new InvalidOperationException($"A group with name '{request.Name}' already exists in this workspace.");
        }

        group.Update(request.Name);
        await _groupRepository.UpdateAsync(group);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new GroupDto(
            group.Id,
            group.WorkspaceId,
            group.Name,
            group.CreatedAtUtc,
            group.UpdatedAtUtc
        );
    }
}
