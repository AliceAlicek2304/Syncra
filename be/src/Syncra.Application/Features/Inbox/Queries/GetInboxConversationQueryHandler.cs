using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxConversationQueryHandler
    : IRequestHandler<GetInboxConversationQuery, InboxConversationDetailsDto>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;

    public GetInboxConversationQueryHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
    }

    public async Task<InboxConversationDetailsDto> Handle(
        GetInboxConversationQuery request,
        CancellationToken cancellationToken)
    {
        var conversation = await _inboxRepository.GetConversationByIdAsync(
            request.WorkspaceId,
            request.ConversationId,
            cancellationToken);

        if (conversation == null)
        {
            throw new DomainException(
                "ConversationNotFound",
                $"InboxConversation '{request.ConversationId}' not found in workspace '{request.WorkspaceId}'.");
        }

        return await _zernioClient.GetInboxConversationAsync(
            conversation.ZernioConversationId,
            request.AccountId,
            cancellationToken);
    }
}
