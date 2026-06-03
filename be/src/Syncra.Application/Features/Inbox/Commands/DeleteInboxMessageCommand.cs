using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public record DeleteInboxMessageCommand(
    Guid WorkspaceId,
    Guid ConversationId,
    string MessageId,
    string AccountId
) : IRequest<bool>;
