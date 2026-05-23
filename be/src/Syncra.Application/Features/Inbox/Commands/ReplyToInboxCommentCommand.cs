using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record ReplyToInboxCommentCommand(
    Guid WorkspaceId,
    Guid CommentId,
    string Message
) : IRequest<InboxSendCommentReplyResponse>;
