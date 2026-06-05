using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class ReplyToInboxCommentCommandHandler
    : IRequestHandler<ReplyToInboxCommentCommand, InboxSendCommentReplyResponse>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioProfileRepository _profileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IInboxCommentListCacheService _listCache;

    public ReplyToInboxCommentCommandHandler(
        IInboxRepository inboxRepository,
        IZernioProfileRepository profileRepository,
        IZernioClient zernioClient,
        IInboxCommentListCacheService listCache)
    {
        _inboxRepository = inboxRepository;
        _profileRepository = profileRepository;
        _zernioClient = zernioClient;
        _listCache = listCache;
    }

    public async Task<InboxSendCommentReplyResponse> Handle(
        ReplyToInboxCommentCommand request,
        CancellationToken cancellationToken)
    {
        InboxCommentedPost? post = await ResolvePostAsync(request.WorkspaceId, request.CommentId, cancellationToken);

        if (post == null)
        {
            throw new DomainException(
                "CommentedPostNotFound",
                $"InboxCommentedPost '{request.CommentId}' not found in workspace '{request.WorkspaceId}'.");
        }

        if (string.IsNullOrEmpty(post.ZernioAccountId))
        {
            throw new DomainException(
                "CommentedPostMissingAccountId",
                $"InboxCommentedPost '{request.CommentId}' has no ZernioAccountId. Cannot reply without an account reference.");
        }

        var profile = await _profileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile == null)
        {
            throw new DomainException(
                "ZernioProfileNotFound",
                $"No ZernioProfile found for workspace '{request.WorkspaceId}'. Connect a Zernio account first.");
        }

        var result = await _zernioClient.ReplyToInboxCommentAsync(
            profile.ZernioProfileId,
            post.ZernioPostId,
            post.ZernioAccountId,
            request.Message,
            commentId: request.CommentId,
            parentCid: request.ParentCid,
            rootUri: request.RootUri,
            rootCid: request.RootCid,
            cancellationToken: cancellationToken);

        await _inboxRepository.DeleteCommentThreadAsync(request.WorkspaceId, post.ZernioPostId, cancellationToken);
        await _listCache.InvalidateAsync(request.WorkspaceId, cancellationToken);

        return new InboxSendCommentReplyResponse(
            result.CommentId,
            result.Cid);
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
