using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class MarkCommentReadCommandHandler
    : IRequestHandler<MarkCommentReadCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkCommentReadCommandHandler(
        IInboxRepository inboxRepository,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(
        MarkCommentReadCommand request,
        CancellationToken cancellationToken)
    {
        var comment = await _inboxRepository.GetCommentByIdAsync(
            request.WorkspaceId,
            request.CommentId,
            cancellationToken);

        if (comment == null)
            return false;

        comment.MarkRead();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }
}
