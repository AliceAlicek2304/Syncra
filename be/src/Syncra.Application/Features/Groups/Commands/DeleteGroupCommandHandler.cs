using MediatR;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Groups.Commands;

public sealed class DeleteGroupCommandHandler : IRequestHandler<DeleteGroupCommand, bool>
{
    private readonly IGroupRepository _groupRepository;
    private readonly IIdeaRepository _ideaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteGroupCommandHandler(IGroupRepository groupRepository, IIdeaRepository ideaRepository, IUnitOfWork unitOfWork)
    {
        _groupRepository = groupRepository;
        _ideaRepository = ideaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(DeleteGroupCommand request, CancellationToken cancellationToken)
    {
        var group = await _groupRepository.GetByIdAsync(request.GroupId, request.WorkspaceId);

        if (group is null)
        {
            return false;
        }

        var ideasInGroup = await _ideaRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        var ideasToMigrate = ideasInGroup.Where(i => i.Status == group.Name).ToList();

        foreach (var idea in ideasToMigrate)
        {
            idea.UpdateStatus("unassigned");
            await _ideaRepository.UpdateAsync(idea);
        }

        group.MarkAsDeleted();
        await _groupRepository.UpdateAsync(group);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}
