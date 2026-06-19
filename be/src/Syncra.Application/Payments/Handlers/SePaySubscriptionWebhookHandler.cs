using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Payments;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Payments.Handlers;

public sealed class SePaySubscriptionWebhookHandler : IPaymentWebhookHandler
{
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SePaySubscriptionWebhookHandler> _logger;

    public string[] SupportedEvents => new[]
    {
        "sepay.payment.succeeded"
    };

    public SePaySubscriptionWebhookHandler(
        ISubscriptionRepository subscriptionRepository,
        IUnitOfWork unitOfWork,
        ILogger<SePaySubscriptionWebhookHandler> logger)
    {
        _subscriptionRepository = subscriptionRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task HandleAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
    {
        if (webhookEvent.WorkspaceId == null)
        {
            _logger.LogWarning("Cannot process SePay subscription webhook — WorkspaceId missing from event {EventId}", webhookEvent.EventId);
            return;
        }

        if (!webhookEvent.Metadata.TryGetValue("PlanId", out var planIdString) || !Guid.TryParse(planIdString, out var planId))
        {
            _logger.LogWarning("Cannot process SePay subscription webhook — PlanId missing or invalid in metadata for event {EventId}", webhookEvent.EventId);
            return;
        }

        webhookEvent.Metadata.TryGetValue("Interval", out var interval);
        var isYearly = string.Equals(interval, "year", StringComparison.OrdinalIgnoreCase);

        var existing = await _subscriptionRepository.GetByWorkspaceIdAsync(webhookEvent.WorkspaceId.Value);
        var now = DateTime.UtcNow;
        var periodEnd = isYearly ? now.AddYears(1) : now.AddMonths(1);

        if (existing == null)
        {
            var subscription = new Subscription
            {
                WorkspaceId = webhookEvent.WorkspaceId.Value,
                PlanId = planId,
                Provider = webhookEvent.Provider,
                ProviderCustomerId = webhookEvent.ProviderCustomerId,
                ProviderSubscriptionId = webhookEvent.ProviderSubscriptionId,
                Status = SubscriptionStatus.Active,
                StartsAtUtc = now,
                EndsAtUtc = periodEnd,
                TrialEndsAtUtc = null,
                CanceledAtUtc = null,
                LastEventTimestampUtc = now
            };

            await _subscriptionRepository.AddAsync(subscription);
            _logger.LogInformation("Created new SePay subscription for workspace {WorkspaceId} on plan {PlanId}", webhookEvent.WorkspaceId, planId);
        }
        else
        {
            existing.PlanId = planId;
            existing.Status = SubscriptionStatus.Active;
            existing.StartsAtUtc = now;
            existing.EndsAtUtc = periodEnd;
            existing.TrialEndsAtUtc = null;
            existing.CanceledAtUtc = null;
            existing.Provider = webhookEvent.Provider;
            existing.ProviderCustomerId = webhookEvent.ProviderCustomerId ?? existing.ProviderCustomerId;
            existing.ProviderSubscriptionId = webhookEvent.ProviderSubscriptionId ?? existing.ProviderSubscriptionId;
            existing.LastEventTimestampUtc = now;

            await _subscriptionRepository.UpdateAsync(existing);
            _logger.LogInformation("Updated existing SePay subscription to Active for workspace {WorkspaceId} on plan {PlanId}", webhookEvent.WorkspaceId, planId);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
