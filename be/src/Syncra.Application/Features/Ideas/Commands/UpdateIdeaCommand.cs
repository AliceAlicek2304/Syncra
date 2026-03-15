using MediatR;
using Syncra.Application.DTOs.Ideas;

namespace Syncra.Application.Features.Ideas.Commands;

public record UpdateIdeaCommand(
    Guid WorkspaceId,
    Guid IdeaId,
    string Title,
    string? Description,
    string Status
) : IRequest<IdeaDto?>;