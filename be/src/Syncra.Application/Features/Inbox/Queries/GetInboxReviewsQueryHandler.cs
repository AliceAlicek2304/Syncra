using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxReviewsQueryHandler
    : IRequestHandler<GetInboxReviewsQuery, IReadOnlyList<InboxReviewDto>>
{
    private readonly IInboxRepository _inboxRepository;

    public GetInboxReviewsQueryHandler(IInboxRepository inboxRepository)
    {
        _inboxRepository = inboxRepository;
    }

    public async Task<IReadOnlyList<InboxReviewDto>> Handle(
        GetInboxReviewsQuery request,
        CancellationToken cancellationToken)
    {
        var reviews = await _inboxRepository.GetReviewsAsync(
            request.WorkspaceId,
            request.Limit,
            request.Before,
            request.Platform,
            request.AccountId,
            cancellationToken);

        return reviews.Select(r => new InboxReviewDto(
            r.Id,
            r.ZernioReviewId,
            r.SocialAccountId,
            r.Platform,
            r.ReviewerName,
            r.ReviewerImageUrl,
            r.StarRating,
            r.ReviewText,
            r.HasReply,
            r.ReplyText,
            r.ReplyCreatedAtUtc,
            r.IsRead,
            r.ReceivedAtUtc,
            r.CreatedAtUtc
        )).ToList();
    }
}
