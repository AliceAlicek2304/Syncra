using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public record GetInboxConversationsQuery(
    Guid WorkspaceId
) : IRequest<IReadOnlyList<InboxConversationDto>>;
