using MediatR;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class LikeInboxCommentCommandHandler
    : IRequestHandler<LikeInboxCommentCommand, ZernioLikeActionResponseDto>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;

    public LikeInboxCommentCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
    }

    public async Task<ZernioLikeActionResponseDto> Handle(
        LikeInboxCommentCommand request,
        CancellationToken cancellationToken)
    {
        var post = await ResolvePostAsync(request.WorkspaceId, request.CommentId, cancellationToken);

        if (post == null)
        {
            throw new DomainException("CommentedPostNotFound", $"InboxCommentedPost '{request.CommentId}' not found.");
        }

        if (string.IsNullOrEmpty(post.ZernioAccountId))
        {
            throw new DomainException("CommentedPostMissingAccountId", "Commented post has no ZernioAccountId.");
        }

        if (string.IsNullOrEmpty(post.ZernioTopCommentId))
        {
            throw new DomainException("CommentedPostMissingTopCommentId", "Commented post has no top comment id.");
        }

        return await _zernioClient.LikeInboxCommentAsync(post.ZernioPostId, post.ZernioTopCommentId, post.ZernioAccountId, request.Cid, cancellationToken);
    }

    private Task<InboxCommentedPost?> ResolvePostAsync(
        Guid workspaceId,
        string commentId,
        CancellationToken cancellationToken)
    {
        if (Guid.TryParse(commentId, out var postGuid))
        {
            return _inboxRepository.GetCommentedPostByIdAsync(workspaceId, postGuid, cancellationToken);
        }
        return _inboxRepository.GetCommentedPostByZernioPostIdAsync(workspaceId, commentId, cancellationToken);
    }
}
