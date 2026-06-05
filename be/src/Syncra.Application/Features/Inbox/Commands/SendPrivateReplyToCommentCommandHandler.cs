using MediatR;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class SendPrivateReplyToCommentCommandHandler
    : IRequestHandler<SendPrivateReplyToCommentCommand, ZernioCommentActionResponseDto>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;

    public SendPrivateReplyToCommentCommandHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
    }

    public async Task<ZernioCommentActionResponseDto> Handle(
        SendPrivateReplyToCommentCommand request,
        CancellationToken cancellationToken)
    {
        if (request.QuickReplies is { Count: > 0 } && request.Buttons is { Count: > 0 })
        {
            throw new DomainException("mutually_exclusive_ctas", "Quick replies and buttons are mutually exclusive.");
        }

        var post = await ResolvePostAsync(request.WorkspaceId, request.CommentId, cancellationToken);

        if (post == null)
        {
            throw new DomainException("CommentedPostNotFound", $"InboxCommentedPost '{request.CommentId}' not found.");
        }

        if (post.ReceivedAtUtc < DateTime.UtcNow.AddDays(-7))
        {
            throw new DomainException("private_reply_expired", "Private reply can only be sent within 7 days of the comment.");
        }

        if (string.IsNullOrEmpty(post.ZernioAccountId))
        {
            throw new DomainException("CommentedPostMissingAccountId", "Commented post has no ZernioAccountId.");
        }

        var alreadySent = await _inboxRepository.HasSentPrivateReplyAsync(request.WorkspaceId, request.CommentId, cancellationToken);
        if (alreadySent)
        {
            throw new DomainException("private_reply_already_sent", "A private reply has already been sent for this comment.");
        }

        var zernioRequest = new ZernioPrivateReplyRequestDto(
            AccountId: post.ZernioAccountId,
            Message: request.Message,
            QuickReplies: request.QuickReplies,
            Buttons: request.Buttons);

        var response = await _zernioClient.SendPrivateReplyToCommentAsync(
            post.ZernioPostId,
            request.CommentId,
            zernioRequest,
            cancellationToken);

        var record = InboxCommentPrivateReply.Create(request.WorkspaceId, request.CommentId);
        await _inboxRepository.AddPrivateReplyRecordAsync(record, cancellationToken);

        return response;
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
