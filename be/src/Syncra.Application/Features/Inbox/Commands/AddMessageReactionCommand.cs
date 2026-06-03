using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record AddMessageReactionCommand(
    Guid WorkspaceId,
    Guid ConversationId,
    string MessageId,
    AddMessageReactionRequest Request
) : IRequest<bool>;
