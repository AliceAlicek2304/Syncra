using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public record GetInboxMessagesQuery(
    Guid WorkspaceId,
    Guid ConversationId,
    int Limit = 50,
    DateTime? Before = null
) : IRequest<IReadOnlyList<InboxMessageDto>>;
