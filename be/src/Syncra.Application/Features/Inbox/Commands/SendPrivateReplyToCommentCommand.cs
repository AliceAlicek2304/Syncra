using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record SendPrivateReplyToCommentCommand(
    Guid WorkspaceId,
    Guid CommentId,
    string Message,
    bool Dummy = false) : IRequest<bool>;
