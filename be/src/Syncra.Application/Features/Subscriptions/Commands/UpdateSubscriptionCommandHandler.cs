using MediatR;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class UpdateSubscriptionCommandHandler : IRequestHandler<UpdateSubscriptionCommand>
    {
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSubscriptionCommandHandler(
            ISubscriptionRepository subscriptionRepository,
            IUnitOfWork unitOfWork)
        {
            _subscriptionRepository = subscriptionRepository;
            _unitOfWork = unitOfWork;
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
                    // Defaulting to PRO plan for now to satisfy foreign key constraint.
                    // In a real scenario, this would be looked up by the Stripe Price ID.
                    PlanId = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                    StripeSubscriptionId = request.SubscriptionId,
                    Status = Domain.Enums.SubscriptionStatus.Active,
                    StartsAtUtc = DateTime.UtcNow,
                    Provider = "stripe"
                };
                await _subscriptionRepository.AddAsync(subscription);
            }
            else
            {
                subscription.StripeSubscriptionId = request.SubscriptionId;
                subscription.Status = Domain.Enums.SubscriptionStatus.Active;
                await _subscriptionRepository.UpdateAsync(subscription);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }
}
