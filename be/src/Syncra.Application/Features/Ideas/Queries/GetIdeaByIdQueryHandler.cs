using MediatR;
using Syncra.Application.DTOs.Ideas;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Ideas.Queries;

public sealed class GetIdeaByIdQueryHandler : IRequestHandler<GetIdeaByIdQuery, IdeaDto?>
{
    private readonly IIdeaRepository _ideaRepository;

    public GetIdeaByIdQueryHandler(IIdeaRepository ideaRepository)
    {
        _ideaRepository = ideaRepository;
    }

    public async Task<IdeaDto?> Handle(GetIdeaByIdQuery request, CancellationToken cancellationToken)
    {
        var idea = await _ideaRepository.GetByIdAsync(request.IdeaId, request.WorkspaceId);

        if (idea is null)
        {
            return null;
        }

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