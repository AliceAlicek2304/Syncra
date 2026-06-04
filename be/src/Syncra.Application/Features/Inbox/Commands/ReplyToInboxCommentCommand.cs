using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record ReplyToInboxCommentCommand(
    Guid WorkspaceId,
    string CommentId,
    string Message,
    string? ParentCid = null,
    string? RootUri = null,
    string? RootCid = null
) : IRequest<InboxSendCommentReplyResponse>;
