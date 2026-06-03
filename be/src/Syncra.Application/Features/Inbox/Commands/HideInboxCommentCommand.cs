using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record HideInboxCommentCommand(
    Guid WorkspaceId,
    Guid CommentId,

    bool Dummy = false) : IRequest<bool>;
