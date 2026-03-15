using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class CancelSubscriptionCommandHandler : IRequestHandler<CancelSubscriptionCommand>
    {
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CancelSubscriptionCommandHandler(
            ISubscriptionRepository subscriptionRepository,
            IUnitOfWork unitOfWork)
        {
            _subscriptionRepository = subscriptionRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task Handle(CancelSubscriptionCommand request, CancellationToken cancellationToken)
        {
            var subscription = await _subscriptionRepository.GetByStripeSubscriptionIdAsync(request.SubscriptionId);

            if (subscription != null)
            {
                subscription.Status = Domain.Enums.SubscriptionStatus.Canceled;
                await _subscriptionRepository.UpdateAsync(subscription);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
