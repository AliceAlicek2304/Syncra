using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record EditInboxMessageCommand(
    Guid WorkspaceId,
    Guid ConversationId,
    string MessageId,
    EditInboxMessageRequest Request
) : IRequest<InboxEditMessageResponseDto>;
