using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record UpdateInboxConversationCommand(
    Guid WorkspaceId,
    Guid ConversationId,
    UpdateInboxConversationRequest Request
) : IRequest<InboxUpdateConversationResponseDto>;
