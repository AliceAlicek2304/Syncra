using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record LikeInboxCommentCommand(
    Guid WorkspaceId,
    Guid CommentId,
    string? Cid = null,
    bool Dummy = false) : IRequest<bool>;
