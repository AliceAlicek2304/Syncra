using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Commands;

public record SendTypingIndicatorCommand(
    Guid WorkspaceId,
    Guid ConversationId,
    SendTypingIndicatorRequest Request
) : IRequest<bool>;
