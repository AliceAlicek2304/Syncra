using MediatR;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class UpdateSubscriptionCommand : IRequest
    {
        public string Provider { get; }
        public string WorkspaceId { get; }
        public string ProviderSubscriptionId { get; }
        public string? ProviderCustomerId { get; }

        public UpdateSubscriptionCommand(string provider, string workspaceId, string providerSubscriptionId, string? providerCustomerId)
        {
            Provider = provider;
            WorkspaceId = workspaceId;
            ProviderSubscriptionId = providerSubscriptionId;
            ProviderCustomerId = providerCustomerId;
        }
    }
}
