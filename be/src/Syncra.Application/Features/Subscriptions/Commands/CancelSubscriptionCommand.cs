using MediatR;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class CancelSubscriptionCommand : IRequest
    {
        public string Provider { get; }
        public string ProviderSubscriptionId { get; }

        public CancelSubscriptionCommand(string provider, string providerSubscriptionId)
        {
            Provider = provider;
            ProviderSubscriptionId = providerSubscriptionId;
        }
    }
}
