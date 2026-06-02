using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxCommentsQueryHandler
    : IRequestHandler<GetInboxCommentsQuery, IReadOnlyList<InboxCommentDto>>
{
    private readonly IInboxRepository _inboxRepository;

    public GetInboxCommentsQueryHandler(IInboxRepository inboxRepository)
    {
        _inboxRepository = inboxRepository;
    }

    public async Task<IReadOnlyList<InboxCommentDto>> Handle(
        GetInboxCommentsQuery request,
        CancellationToken cancellationToken)
    {
        var comments = await _inboxRepository.GetCommentsAsync(
            request.WorkspaceId,
            request.Limit,
            request.Before,
            request.Platform,
            request.AccountId,
            cancellationToken);

        return comments.Select(c => new InboxCommentDto(
            c.Id,
            c.ZernioCommentId,
            c.SocialAccountId,
            c.Platform,
            c.AuthorName,
            c.AuthorUsername,
            c.AuthorPicture,
            c.BodyText,
            c.ZernioPostId,
            c.ZernioAccountId,
            c.PostPreviewCaption,
            c.PostPreviewThumbnailUrl,
            c.CommentCount,
            c.ZernioTopCommentId,
            c.IsRead,
            c.ReceivedAtUtc,
            c.CreatedAtUtc
        )).ToList();
    }
}
