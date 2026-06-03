using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class AddMessageReactionCommandHandler
    : IRequestHandler<AddMessageReactionCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;

    public AddMessageReactionCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
    }

    public async Task<bool> Handle(
        AddMessageReactionCommand request,
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

        return await _zernioClient.AddMessageReactionAsync(
            conversation.ZernioConversationId,
            request.MessageId,
            request.Request,
            cancellationToken);
    }
}
