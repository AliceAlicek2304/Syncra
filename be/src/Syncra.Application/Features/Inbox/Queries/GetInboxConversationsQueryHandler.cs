using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxConversationsQueryHandler
    : IRequestHandler<GetInboxConversationsQuery, IReadOnlyList<InboxConversationDto>>
{
    private readonly IInboxRepository _inboxRepository;

    public GetInboxConversationsQueryHandler(IInboxRepository inboxRepository)
    {
        _inboxRepository = inboxRepository;
    }

    public async Task<IReadOnlyList<InboxConversationDto>> Handle(
        GetInboxConversationsQuery request,
        CancellationToken cancellationToken)
    {
        var conversations = await _inboxRepository.GetConversationsAsync(
            request.WorkspaceId,
            cancellationToken);

        return conversations.Select(c => new InboxConversationDto(
            c.Id,
            c.ZernioConversationId,
            c.Platform,
            c.ParticipantName,
            c.ParticipantAvatarUrl,
            c.LastMessageText,
            c.LastMessageAtUtc,
            c.UnreadCount,
            c.IsRead,
            c.SocialAccountId,
            c.CreatedAtUtc
        )).ToList();
    }
}
