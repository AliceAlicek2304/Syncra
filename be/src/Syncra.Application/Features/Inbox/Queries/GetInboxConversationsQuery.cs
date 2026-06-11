using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public record GetInboxConversationsQuery(
    Guid WorkspaceId,
    Guid? ProfileId = null
) : IRequest<IReadOnlyList<InboxConversationDto>>;
