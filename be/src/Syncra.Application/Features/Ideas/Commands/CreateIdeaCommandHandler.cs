using MediatR;
using Syncra.Application.DTOs.Ideas;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Ideas.Commands;

public sealed class CreateIdeaCommandHandler : IRequestHandler<CreateIdeaCommand, IdeaDto>
{
    private readonly IIdeaRepository _ideaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateIdeaCommandHandler(IIdeaRepository ideaRepository, IUnitOfWork unitOfWork)
    {
        _ideaRepository = ideaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IdeaDto> Handle(CreateIdeaCommand request, CancellationToken cancellationToken)
    {
        var idea = Idea.Create(
            request.WorkspaceId,
            request.Title,
            request.Description,
            request.Status);

        await _ideaRepository.AddAsync(idea);
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