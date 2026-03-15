using MediatR;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Ideas.Commands;

public sealed class DeleteIdeaCommandHandler : IRequestHandler<DeleteIdeaCommand, bool>
{
    private readonly IIdeaRepository _ideaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteIdeaCommandHandler(IIdeaRepository ideaRepository, IUnitOfWork unitOfWork)
    {
        _ideaRepository = ideaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(DeleteIdeaCommand request, CancellationToken cancellationToken)
    {
        var idea = await _ideaRepository.GetByIdAsync(request.IdeaId, request.WorkspaceId);

        if (idea is null)
        {
            return false;
        }

        // Soft delete
        idea.MarkAsDeleted();
        await _ideaRepository.UpdateAsync(idea);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}