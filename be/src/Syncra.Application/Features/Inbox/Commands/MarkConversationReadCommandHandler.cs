using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class MarkConversationReadCommandHandler
    : IRequestHandler<MarkConversationReadCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkConversationReadCommandHandler(
        IInboxRepository inboxRepository,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
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

        conversation.MarkRead();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }
}
