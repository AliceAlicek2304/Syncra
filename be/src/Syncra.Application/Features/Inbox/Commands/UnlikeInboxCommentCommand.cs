using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record UnlikeInboxCommentCommand(
    Guid WorkspaceId,
    Guid CommentId,
    string? LikeUri = null,
    bool Dummy = false) : IRequest<bool>;
