using MediatR;
using Syncra.Application.DTOs.Ideas;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Ideas.Queries;

public sealed class GetIdeasQueryHandler : IRequestHandler<GetIdeasQuery, IReadOnlyList<IdeaDto>>
{
    private readonly IIdeaRepository _ideaRepository;

    public GetIdeasQueryHandler(IIdeaRepository ideaRepository)
    {
        _ideaRepository = ideaRepository;
    }

    public async Task<IReadOnlyList<IdeaDto>> Handle(GetIdeasQuery request, CancellationToken cancellationToken)
    {
        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 && request.PageSize <= 100 ? request.PageSize : 20;

        var (items, _) = await _ideaRepository.GetFilteredAsync(
            request.WorkspaceId,
            request.Status,
            page,
            pageSize,
            cancellationToken);

        return items.Select(i => new IdeaDto(
            i.Id,
            i.WorkspaceId,
            i.Title,
            i.Description,
            i.Status,
            i.CreatedAtUtc,
            i.UpdatedAtUtc
        )).ToList();
    }
}