using MediatR;
using Syncra.Application.DTOs.Ideas;

namespace Syncra.Application.Features.Ideas.Queries;

public record GetIdeaByIdQuery(
    Guid WorkspaceId,
    Guid IdeaId
) : IRequest<IdeaDto?>;