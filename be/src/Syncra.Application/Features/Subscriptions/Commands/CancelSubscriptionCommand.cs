using MediatR;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class CancelSubscriptionCommand : IRequest
    {
        public string SubscriptionId { get; }

        public CancelSubscriptionCommand(string subscriptionId)
        {
            SubscriptionId = subscriptionId;
        }
    }
}
