using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class HideInboxCommentCommandHandler
    : IRequestHandler<HideInboxCommentCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;

    public HideInboxCommentCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
    }

    public async Task<bool> Handle(
        HideInboxCommentCommand request,
        CancellationToken cancellationToken)
    {
        var comment = await _inboxRepository.GetCommentByIdAsync(
            request.WorkspaceId,
            request.CommentId,
            cancellationToken);

        if (comment == null)
        {
            throw new DomainException("CommentNotFound", $"InboxComment '{request.CommentId}' not found.");
        }

        if (string.IsNullOrEmpty(comment.ZernioPostId))
        {
            throw new DomainException("CommentMissingPostId", "Comment has no ZernioPostId.");
        }
        
        if (string.IsNullOrEmpty(comment.ZernioAccountId))
        {
            throw new DomainException("CommentMissingAccountId", "Comment has no ZernioAccountId.");
        }

        return await _zernioClient.HideInboxCommentAsync(comment.ZernioPostId, comment.ZernioCommentId, comment.ZernioAccountId, cancellationToken);
    }
}
