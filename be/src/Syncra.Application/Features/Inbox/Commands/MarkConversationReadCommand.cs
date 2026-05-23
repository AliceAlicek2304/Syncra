using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public record MarkConversationReadCommand(
    Guid WorkspaceId,
    Guid ConversationId
) : IRequest<bool>;
