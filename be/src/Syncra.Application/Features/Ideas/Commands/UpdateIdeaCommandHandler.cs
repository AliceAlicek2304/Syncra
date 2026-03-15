using MediatR;
using Syncra.Application.DTOs.Ideas;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Ideas.Commands;

public sealed class UpdateIdeaCommandHandler : IRequestHandler<UpdateIdeaCommand, IdeaDto?>
{
    private readonly IIdeaRepository _ideaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateIdeaCommandHandler(IIdeaRepository ideaRepository, IUnitOfWork unitOfWork)
    {
        _ideaRepository = ideaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IdeaDto?> Handle(UpdateIdeaCommand request, CancellationToken cancellationToken)
    {
        var idea = await _ideaRepository.GetByIdAsync(request.IdeaId, request.WorkspaceId);

        if (idea is null)
        {
            return null;
        }

        idea.Update(request.Title, request.Description, request.Status);
        await _ideaRepository.UpdateAsync(idea);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new IdeaDto(
            idea.Id,
            idea.WorkspaceId,
            idea.Title,
            idea.Description,
            idea.Status,
            idea.CreatedAtUtc,
            idea.UpdatedAtUtc
        );
    }
}