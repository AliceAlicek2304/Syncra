using MediatR;
using Syncra.Application.DTOs.Groups;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Groups.Commands;

public sealed class CreateGroupCommandHandler : IRequestHandler<CreateGroupCommand, GroupDto>
{
    private readonly IGroupRepository _groupRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateGroupCommandHandler(IGroupRepository groupRepository, IUnitOfWork unitOfWork)
    {
        _groupRepository = groupRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<GroupDto> Handle(CreateGroupCommand request, CancellationToken cancellationToken)
    {
        var exists = await _groupRepository.ExistsWithNameAsync(request.WorkspaceId, request.Name);
        if (exists)
        {
            throw new InvalidOperationException($"A group with name '{request.Name}' already exists in this workspace.");
        }

        var group = Group.Create(
            request.WorkspaceId,
            request.Name);

        await _groupRepository.AddAsync(group);
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
