using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class MarkConversationReadCommandHandler
    : IRequestHandler<MarkConversationReadCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public MarkConversationReadCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(
        MarkConversationReadCommand request,
        CancellationToken cancellationToken)
    {
        var conversation = await _inboxRepository.GetConversationByIdAsync(
            request.WorkspaceId,
            request.ConversationId,
            cancellationToken);

        if (conversation == null)
        {
            return false;
        }

        if (conversation.SocialAccount != null && !string.IsNullOrEmpty(conversation.SocialAccount.ExternalAccountId))
        {
            await _zernioClient.MarkConversationReadAsync(
                conversation.ZernioConversationId,
                conversation.SocialAccount.ExternalAccountId,
                cancellationToken);
        }

        conversation.MarkRead();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }
}
