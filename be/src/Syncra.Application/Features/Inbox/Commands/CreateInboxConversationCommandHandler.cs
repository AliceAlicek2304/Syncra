using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class CreateInboxConversationCommandHandler
    : IRequestHandler<CreateInboxConversationCommand, InboxCreateConversationResponseDto>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public CreateInboxConversationCommandHandler(
        IInboxRepository inboxRepository,
        ISocialAccountRepository socialAccountRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _socialAccountRepository = socialAccountRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<InboxCreateConversationResponseDto> Handle(
        CreateInboxConversationCommand request,
        CancellationToken cancellationToken)
    {
        var socialAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        var socialAccount = socialAccounts.FirstOrDefault(sa => sa.ExternalAccountId == request.Request.AccountId);

        if (socialAccount == null)
        {
            throw new DomainException(
                "SocialAccountNotFound",
                $"SocialAccount '{request.Request.AccountId}' not found in workspace '{request.WorkspaceId}'.");
        }

        // Call Zernio SDK via the client wrapper
        var result = await _zernioClient.CreateInboxConversationAsync(request.Request, cancellationToken);

        // Check if conversation already exists in our database
        var conversation = await _inboxRepository.GetConversationByZernioIdAsync(
            request.WorkspaceId,
            result.ConversationId,
            cancellationToken);

        bool conversationExists = conversation != null;

        if (conversation == null)
        {
            conversation = InboxConversation.Create(
                request.WorkspaceId,
                result.ConversationId,
                socialAccount.Id,
                socialAccount.Platform,
                result.ParticipantName ?? result.ParticipantUsername ?? "Contact",
                null,
                request.Request.Message,
                DateTime.UtcNow
            );
            await _inboxRepository.AddConversationAsync(conversation);
        }
        else
        {
            conversation.UpdateLastMessage(request.Request.Message, DateTime.UtcNow);
        }

        if (!string.IsNullOrEmpty(request.Request.Message))
        {
            var message = InboxMessage.Create(
                request.WorkspaceId,
                conversation.Id,
                result.MessageId,
                "Outbound",
                request.Request.Message,
                DateTime.UtcNow,
                socialAccount.ExternalAccountId
            );
            await _inboxRepository.AddMessageAsync(message);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return result;
    }
}
