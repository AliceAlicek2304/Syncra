using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;

using Syncra.Application.Payments.Handlers;
using System.Collections.Generic;
using System.Linq;

namespace Syncra.Application.Payments;

public sealed class PaymentWebhookEventDispatcher : IPaymentWebhookEventDispatcher
{
    private readonly IMediator _mediator;
    private readonly IEnumerable<IPaymentWebhookHandler> _handlers;
    private readonly ILogger<PaymentWebhookEventDispatcher> _logger;

    public PaymentWebhookEventDispatcher(
        IMediator mediator,
        IEnumerable<IPaymentWebhookHandler> handlers,
        ILogger<PaymentWebhookEventDispatcher> logger)
    {
        _mediator = mediator;
        _handlers = handlers;
        _logger = logger;
    }

    public async Task DispatchAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
    {
        var handlers = _handlers.Where(h => h.SupportedEvents.Contains(webhookEvent.EventType)).ToList();
        if (handlers.Any())
        {
            foreach (var handler in handlers)
            {
                await handler.HandleAsync(webhookEvent, cancellationToken);
            }
            return;
        }

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
