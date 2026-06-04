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

    public ReplyToInboxCommentCommandHandler(
        IInboxRepository inboxRepository,
        IZernioProfileRepository profileRepository,
        IZernioClient zernioClient)
    {
        _inboxRepository = inboxRepository;
        _profileRepository = profileRepository;
        _zernioClient = zernioClient;
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
            commentId: post.ZernioTopCommentId,
            parentCid: request.ParentCid,
            rootUri: request.RootUri,
            rootCid: request.RootCid,
            cancellationToken: cancellationToken);

        return new InboxSendCommentReplyResponse(
            result.CommentId,
            result.Cid);
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
