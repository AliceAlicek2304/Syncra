using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record ReplyToInboxReviewCommand(
    Guid WorkspaceId,
    Guid ReviewId,
    string Message
) : IRequest<InboxSendReviewReplyResponse>;
