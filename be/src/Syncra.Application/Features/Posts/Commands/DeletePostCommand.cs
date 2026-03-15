using MediatR;

namespace Syncra.Application.Features.Posts.Commands;

public record DeletePostCommand(
    Guid WorkspaceId,
    Guid PostId
) : IRequest<bool>;