using MediatR;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class UnhideInboxCommentCommandHandler
    : IRequestHandler<UnhideInboxCommentCommand, ZernioCommentActionResponseDto>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IInboxCommentListCacheService _listCache;

    public UnhideInboxCommentCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient,
        IInboxCommentListCacheService listCache)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
        _listCache = listCache;
    }

    public async Task<ZernioCommentActionResponseDto> Handle(
        UnhideInboxCommentCommand request,
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

        var result = await _zernioClient.UnhideInboxCommentAsync(post.ZernioPostId, request.CommentId, post.ZernioAccountId, cancellationToken);

        await _inboxRepository.DeleteCommentThreadAsync(request.WorkspaceId, post.ZernioPostId, cancellationToken);
        await _listCache.InvalidateAsync(request.WorkspaceId, cancellationToken);

        return result;
    }

    private async Task<InboxCommentedPost?> ResolvePostAsync(
        Guid workspaceId,
        string commentId,
        CancellationToken cancellationToken)
    {
        if (Guid.TryParse(commentId, out var postGuid))
        {
            return await _inboxRepository.GetCommentedPostByIdAsync(workspaceId, postGuid, cancellationToken);
        }

        var post = await _inboxRepository.GetCommentedPostByZernioPostIdAsync(workspaceId, commentId, cancellationToken);
        if (post != null) return post;

        if (commentId.Contains('_'))
        {
            var parts = commentId.Split('_');
            post = await _inboxRepository.GetCommentedPostByZernioPostIdAsync(workspaceId, parts[0], cancellationToken);
            if (post != null) return post;
        }

        return null;
    }
}
