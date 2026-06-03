using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class EditInboxMessageCommandHandler
    : IRequestHandler<EditInboxMessageCommand, InboxEditMessageResponseDto>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public EditInboxMessageCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<InboxEditMessageResponseDto> Handle(
        EditInboxMessageCommand request,
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

        var result = await _zernioClient.EditInboxMessageAsync(
            conversation.ZernioConversationId,
            request.MessageId,
            request.Request,
            cancellationToken);

        if (message != null)
        {
            // Sync conversation's last message text if this was the last message
            if (conversation.LastMessageText == message.BodyText)
            {
                conversation.UpdateLastMessage(request.Request.Text, conversation.LastMessageAtUtc);
            }

            message.UpdateBodyText(request.Request.Text);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return result;
    }
}
