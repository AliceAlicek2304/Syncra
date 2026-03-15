using MediatR;

namespace Syncra.Application.Features.Ideas.Commands;

public record DeleteIdeaCommand(
    Guid WorkspaceId,
    Guid IdeaId
) : IRequest<bool>;