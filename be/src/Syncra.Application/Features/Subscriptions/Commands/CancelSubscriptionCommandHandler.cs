using MediatR;
using Syncra.Application.Repositories;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class CancelSubscriptionCommandHandler : IRequestHandler<CancelSubscriptionCommand>
    {
        private readonly ISubscriptionRepository _subscriptionRepository;

        public CancelSubscriptionCommandHandler(ISubscriptionRepository subscriptionRepository)
        {
            _subscriptionRepository = subscriptionRepository;
        }

        public async Task Handle(CancelSubscriptionCommand request, CancellationToken cancellationToken)
        {
            var subscription = await _subscriptionRepository.GetByStripeSubscriptionIdAsync(request.SubscriptionId);

            if (subscription != null)
            {
                subscription.Status = Domain.Enums.SubscriptionStatus.Canceled;
                await _subscriptionRepository.UpdateAsync(subscription);
            }
        }
    }
}
