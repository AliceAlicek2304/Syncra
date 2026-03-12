using MediatR;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class UpdateSubscriptionCommandHandler : IRequestHandler<UpdateSubscriptionCommand>
    {
        private readonly ISubscriptionRepository _subscriptionRepository;

        public UpdateSubscriptionCommandHandler(ISubscriptionRepository subscriptionRepository)
        {
            _subscriptionRepository = subscriptionRepository;
        }

        public async Task Handle(UpdateSubscriptionCommand request, CancellationToken cancellationToken)
        {
            var workspaceId = Guid.Parse(request.WorkspaceId);
            var subscription = await _subscriptionRepository.GetByWorkspaceIdAsync(workspaceId);

            if (subscription == null)
            {
                subscription = new Subscription
                {
                    WorkspaceId = workspaceId,
                    StripeSubscriptionId = request.SubscriptionId,
                    Status = Domain.Enums.SubscriptionStatus.Active
                };
                await _subscriptionRepository.AddAsync(subscription);
            }
            else
            {
                subscription.StripeSubscriptionId = request.SubscriptionId;
                subscription.Status = Domain.Enums.SubscriptionStatus.Active;
                await _subscriptionRepository.UpdateAsync(subscription);
            }
        }
    }
}
