using MediatR;
using Syncra.Domain.Entities;
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
        InboxCommentedPost? post = null;
        if (Guid.TryParse(request.CommentId, out var postGuid))
        {
            post = await _inboxRepository.GetCommentedPostByIdAsync(
                request.WorkspaceId,
                postGuid,
                cancellationToken);
        }
        else
        {
            post = await _inboxRepository.GetCommentedPostByZernioPostIdAsync(
                request.WorkspaceId,
                request.CommentId,
                cancellationToken);
        }

        if (post == null)
            return false;

        post.MarkRead();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }
}
