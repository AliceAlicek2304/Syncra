using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class DeleteInboxMessageCommandHandler
    : IRequestHandler<DeleteInboxMessageCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteInboxMessageCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(
        DeleteInboxMessageCommand request,
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

        var message = await _inboxRepository.GetMessageByZernioIdAsync(
            request.WorkspaceId,
            request.MessageId,
            cancellationToken);

        var success = await _zernioClient.DeleteInboxMessageAsync(
            conversation.ZernioConversationId,
            request.MessageId,
            request.AccountId,
            cancellationToken);

        if (success && message != null)
        {
            if (conversation.LastMessageText == message.BodyText)
            {
                // Find next most recent message excluding this one
                var nextRecentMessage = (await _inboxRepository.GetMessagesAsync(
                    request.WorkspaceId,
                    conversation.Id,
                    limit: 2,
                    before: null,
                    cancellationToken: cancellationToken
                )).FirstOrDefault(m => m.Id != message.Id);

                if (nextRecentMessage != null)
                {
                    conversation.UpdateLastMessage(nextRecentMessage.BodyText, nextRecentMessage.SentAtUtc);
                }
                else
                {
                    conversation.UpdateLastMessage(null, null);
                }
            }

            await _inboxRepository.DeleteMessageAsync(message);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return success;
    }
}
