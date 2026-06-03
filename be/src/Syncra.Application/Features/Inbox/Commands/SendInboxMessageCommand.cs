using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record SendInboxMessageCommand(
    Guid WorkspaceId,
    Guid ConversationId,
    InboxSendMessageRequest Request
) : IRequest<SendInboxMessageResponse>;
