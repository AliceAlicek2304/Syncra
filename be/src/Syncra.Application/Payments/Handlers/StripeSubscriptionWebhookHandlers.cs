using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Payments;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Payments.Handlers;

public sealed class StripeSubscriptionWebhookHandlers : IPaymentWebhookHandler
{
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<StripeSubscriptionWebhookHandlers> _logger;

    public string[] SupportedEvents => new[]
    {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted"
    };

    public StripeSubscriptionWebhookHandlers(
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IUnitOfWork unitOfWork,
        ILogger<StripeSubscriptionWebhookHandlers> logger)
    {
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task HandleAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
    {
        var providerSubscriptionId = webhookEvent.ProviderSubscriptionId;
        if (string.IsNullOrWhiteSpace(providerSubscriptionId))
        {
            _logger.LogWarning("Missing ProviderSubscriptionId in webhook event {EventId}", webhookEvent.EventId);
            return;
        }

        var existing = await _subscriptionRepository.GetByProviderSubscriptionIdAsync(
            webhookEvent.Provider, providerSubscriptionId);

        if (webhookEvent.EventType == "customer.subscription.deleted")
        {
            if (existing != null)
            {
                existing.Status = SubscriptionStatus.Canceled;
                existing.CanceledAtUtc = DateTime.UtcNow;
                await _subscriptionRepository.UpdateAsync(existing);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            return;
        }

        // Resolve PlanId from the first item's PriceId
        Guid? resolvedPlanId = null;
        if (webhookEvent.Metadata.TryGetValue("PriceId", out var priceId) && !string.IsNullOrWhiteSpace(priceId))
        {
            var plan = await _planRepository.GetByStripePriceIdAsync(priceId, cancellationToken);
            if (plan != null)
            {
                resolvedPlanId = plan.Id;
            }
            else
            {
                _logger.LogWarning("No local Plan found for PriceId {PriceId} from subscription event {EventId}", priceId, webhookEvent.EventId);
            }
        }

        var status = MapStripeStatus(webhookEvent.Metadata.TryGetValue("SubscriptionStatus", out var s) ? s : "active");
        var periodStart = TryParseDate(webhookEvent.Metadata.TryGetValue("CurrentPeriodStart", out var ps) ? ps : null);
        var periodEnd = TryParseDate(webhookEvent.Metadata.TryGetValue("CurrentPeriodEnd", out var pe) ? pe : null);
        var canceledAt = TryParseDate(webhookEvent.Metadata.TryGetValue("CanceledAt", out var ca) ? ca : null);
        var trialEnd = TryParseDate(webhookEvent.Metadata.TryGetValue("TrialEnd", out var te) ? te : null);

        if (existing == null)
        {
            if (webhookEvent.WorkspaceId == null)
            {
                _logger.LogWarning("Cannot create Subscription — WorkspaceId missing from event {EventId}", webhookEvent.EventId);
                return;
            }

            var subscription = new Subscription
            {
                WorkspaceId = webhookEvent.WorkspaceId.Value,
                PlanId = resolvedPlanId ?? Guid.Empty,
                Provider = webhookEvent.Provider,
                ProviderCustomerId = webhookEvent.ProviderCustomerId,
                ProviderSubscriptionId = providerSubscriptionId,
                Status = status,
                StartsAtUtc = periodStart ?? DateTime.UtcNow,
                EndsAtUtc = periodEnd,
                CanceledAtUtc = canceledAt,
                TrialEndsAtUtc = trialEnd
            };

            await _subscriptionRepository.AddAsync(subscription);
        }
        else
        {
            if (resolvedPlanId.HasValue)
                existing.PlanId = resolvedPlanId.Value;

            existing.ProviderCustomerId = webhookEvent.ProviderCustomerId ?? existing.ProviderCustomerId;
            existing.Status = status;
            existing.StartsAtUtc = periodStart ?? existing.StartsAtUtc;
            existing.EndsAtUtc = periodEnd;
            existing.CanceledAtUtc = canceledAt;
            existing.TrialEndsAtUtc = trialEnd;

            await _subscriptionRepository.UpdateAsync(existing);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static SubscriptionStatus MapStripeStatus(string stripeStatus)
    {
        return stripeStatus switch
        {
            "active" => SubscriptionStatus.Active,
            "canceled" => SubscriptionStatus.Canceled,
            "past_due" => SubscriptionStatus.PastDue,
            "unpaid" => SubscriptionStatus.Unpaid,
            "trialing" => SubscriptionStatus.Trialing,
            "incomplete_expired" => SubscriptionStatus.Expired,
            _ => SubscriptionStatus.Active
        };
    }

    private static DateTime? TryParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return DateTime.TryParse(value, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)
            ? dt
            : null;
    }
}
