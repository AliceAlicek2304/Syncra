using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class ReplyToInboxReviewCommandHandler
    : IRequestHandler<ReplyToInboxReviewCommand, InboxSendReviewReplyResponse>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioProfileRepository _profileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public ReplyToInboxReviewCommandHandler(
        IInboxRepository inboxRepository,
        IZernioProfileRepository profileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _profileRepository = profileRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<InboxSendReviewReplyResponse> Handle(
        ReplyToInboxReviewCommand request,
        CancellationToken cancellationToken)
    {
        // Verify review exists and belongs to workspace
        var review = await _inboxRepository.GetReviewByIdAsync(
            request.WorkspaceId,
            request.ReviewId,
            cancellationToken);

        if (review == null)
        {
            throw new DomainException(
                "ReviewNotFound",
                $"InboxReview '{request.ReviewId}' not found in workspace '{request.WorkspaceId}'.");
        }

        // Resolve ZernioProfile for API call
        var profile = await _profileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile == null)
        {
            throw new DomainException(
                "ZernioProfileNotFound",
                $"No ZernioProfile found for workspace '{request.WorkspaceId}'. Connect a Zernio account first.");
        }

        // Reply via Zernio API
        var result = await _zernioClient.ReplyToInboxReviewAsync(
            profile.ZernioProfileId,
            review.ZernioReviewId,
            review.ZernioAccountId ?? string.Empty,
            request.Message,
            cancellationToken);

        // Update local state: mark HasReply on success
        review.MarkReplied(request.Message);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new InboxSendReviewReplyResponse(result.ReplyId);
    }
}
