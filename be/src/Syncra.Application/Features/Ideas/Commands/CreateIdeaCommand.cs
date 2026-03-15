using MediatR;
using Syncra.Application.DTOs.Ideas;

namespace Syncra.Application.Features.Ideas.Commands;

public record CreateIdeaCommand(
    Guid WorkspaceId,
    string Title,
    string? Description,
    string Status
) : IRequest<IdeaDto>;