using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record CreateInboxConversationCommand(
    Guid WorkspaceId,
    CreateInboxConversationRequest Request
) : IRequest<InboxCreateConversationResponseDto>;
