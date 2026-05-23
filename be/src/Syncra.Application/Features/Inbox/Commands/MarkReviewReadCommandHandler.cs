using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class MarkReviewReadCommandHandler
    : IRequestHandler<MarkReviewReadCommand, bool>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkReviewReadCommandHandler(
        IInboxRepository inboxRepository,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(
        MarkReviewReadCommand request,
        CancellationToken cancellationToken)
    {
        var review = await _inboxRepository.GetReviewByIdAsync(
            request.WorkspaceId,
            request.ReviewId,
            cancellationToken);

        if (review == null)
            return false;

        review.MarkRead();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }
}
