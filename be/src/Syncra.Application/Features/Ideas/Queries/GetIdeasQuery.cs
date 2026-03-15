using MediatR;
using Syncra.Application.DTOs.Ideas;

namespace Syncra.Application.Features.Ideas.Queries;

public record GetIdeasQuery(
    Guid WorkspaceId,
    string? Status = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<IReadOnlyList<IdeaDto>>;