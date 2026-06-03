using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public record GetInboxConversationQuery(
    Guid WorkspaceId,
    Guid ConversationId,
    string AccountId
) : IRequest<InboxConversationDetailsDto>;
