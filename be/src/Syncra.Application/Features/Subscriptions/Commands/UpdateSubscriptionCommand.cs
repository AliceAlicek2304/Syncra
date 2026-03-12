using MediatR;

namespace Syncra.Application.Features.Subscriptions.Commands
{
    public class UpdateSubscriptionCommand : IRequest
    {
        public string WorkspaceId { get; }
        public string SubscriptionId { get; }

        public UpdateSubscriptionCommand(string workspaceId, string subscriptionId)
        {
            WorkspaceId = workspaceId;
            SubscriptionId = subscriptionId;
        }
    }
}
