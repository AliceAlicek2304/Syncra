using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
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
        // Verify comment exists and belongs to workspace
        var comment = await _inboxRepository.GetCommentByIdAsync(
            request.WorkspaceId,
            request.CommentId,
            cancellationToken);

        if (comment == null)
        {
            throw new DomainException(
                "CommentNotFound",
                $"InboxComment '{request.CommentId}' not found in workspace '{request.WorkspaceId}'.");
        }

        if (string.IsNullOrEmpty(comment.ZernioPostId))
        {
            throw new DomainException(
                "CommentMissingPostId",
                $"InboxComment '{request.CommentId}' has no ZernioPostId. Cannot reply without a post reference.");
        }

        // Resolve ZernioProfile for API call
        var profile = await _profileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile == null)
        {
            throw new DomainException(
                "ZernioProfileNotFound",
                $"No ZernioProfile found for workspace '{request.WorkspaceId}'. Connect a Zernio account first.");
        }

        // Reply via Zernio API using stored post/account IDs
        var result = await _zernioClient.ReplyToInboxCommentAsync(
            profile.ZernioProfileId,
            comment.ZernioPostId,
            comment.ZernioAccountId ?? string.Empty,
            request.Message,
            comment.ParentCommentId,
            cancellationToken);

        return new InboxSendCommentReplyResponse(
            result.CommentId,
            result.Cid);
    }
}
