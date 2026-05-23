using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxMessagesQueryHandler
    : IRequestHandler<GetInboxMessagesQuery, IReadOnlyList<InboxMessageDto>>
{
    private readonly IInboxRepository _inboxRepository;

    public GetInboxMessagesQueryHandler(IInboxRepository inboxRepository)
    {
        _inboxRepository = inboxRepository;
    }

    public async Task<IReadOnlyList<InboxMessageDto>> Handle(
        GetInboxMessagesQuery request,
        CancellationToken cancellationToken)
    {
        var messages = await _inboxRepository.GetMessagesAsync(
            request.WorkspaceId,
            request.ConversationId,
            request.Limit,
            request.Before,
            cancellationToken);

        return messages.Select(m => new InboxMessageDto(
            m.Id,
            m.InboxConversationId,
            m.ZernioMessageId,
            m.Direction,
            m.BodyText,
            m.SentAtUtc,
            null, // ZernioAccountId — not stored on InboxMessage entity
            m.CreatedAtUtc
        )).ToList();
    }
}
