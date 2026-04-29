using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;

namespace Syncra.Application.Payments;

public sealed class PaymentWebhookEventDispatcher : IPaymentWebhookEventDispatcher
{
    private readonly IMediator _mediator;
    private readonly ILogger<PaymentWebhookEventDispatcher> _logger;

    public PaymentWebhookEventDispatcher(
        IMediator mediator,
        ILogger<PaymentWebhookEventDispatcher> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task DispatchAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
    {
        switch (webhookEvent.EventType)
        {
            case "checkout.session.completed":
                if (webhookEvent.WorkspaceId is null || string.IsNullOrWhiteSpace(webhookEvent.ProviderSubscriptionId))
                {
                    _logger.LogWarning("Ignoring checkout.session.completed event {EventId} due to missing workspace or provider subscription id.", webhookEvent.EventId);
                    return;
                }

                await _mediator.Send(
                    new UpdateSubscriptionCommand(
                        webhookEvent.Provider,
                        webhookEvent.WorkspaceId.Value.ToString(),
                        webhookEvent.ProviderSubscriptionId,
                        webhookEvent.ProviderCustomerId),
                    cancellationToken);
                return;

            case "customer.subscription.deleted":
                if (string.IsNullOrWhiteSpace(webhookEvent.ProviderSubscriptionId))
                {
                    _logger.LogWarning("Ignoring customer.subscription.deleted event {EventId} due to missing provider subscription id.", webhookEvent.EventId);
                    return;
                }

                await _mediator.Send(
                    new CancelSubscriptionCommand(webhookEvent.Provider, webhookEvent.ProviderSubscriptionId),
                    cancellationToken);
                return;

            default:
                _logger.LogInformation("Ignoring unsupported payment webhook event type {EventType} for provider {Provider}.", webhookEvent.EventType, webhookEvent.Provider);
                return;
        }
    }
}
