using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class SendInboxMessageCommandHandler
    : IRequestHandler<SendInboxMessageCommand, SendInboxMessageResponse>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioProfileRepository _profileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public SendInboxMessageCommandHandler(
        IInboxRepository inboxRepository,
        IZernioProfileRepository profileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _profileRepository = profileRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<SendInboxMessageResponse> Handle(
        SendInboxMessageCommand request,
        CancellationToken cancellationToken)
    {
        // Verify conversation exists and belongs to workspace
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

        // Resolve ZernioProfile to get the external profile ID for the API call
        var profile = await _profileRepository.GetByWorkspaceIdAsync(
            request.WorkspaceId);

        if (profile == null)
        {
            throw new DomainException(
                "ZernioProfileNotFound",
                $"No ZernioProfile found for workspace '{request.WorkspaceId}'. Connect a Zernio account first.");
        }

        // Send via Zernio API
        var zernioResult = await _zernioClient.SendInboxMessageAsync(
            profile.ZernioProfileId,
            conversation.ZernioConversationId,
            request.Request,
            cancellationToken);

        var bodyText = request.Request.Text ?? request.Request.AttachmentUrl ?? "[Media/Interactive]";

        // Persist to local DB
        var message = InboxMessage.Create(
            request.WorkspaceId,
            request.ConversationId,
            zernioResult.MessageId,
            "Outbound",
            bodyText,
            zernioResult.SentAtUtc,
            request.Request.AccountId);

        await _inboxRepository.AddMessageAsync(message);

        // Update conversation last message
        conversation.UpdateLastMessage(bodyText, zernioResult.SentAtUtc);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SendInboxMessageResponse(
            zernioResult.MessageId,
            zernioResult.SentAtUtc);
    }
}