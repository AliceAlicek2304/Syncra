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
    private readonly IBillingPaymentRepository _billingPaymentRepository;
    private readonly IBillingVoucherRepository _billingVoucherRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SePaySubscriptionWebhookHandler> _logger;

    public string[] SupportedEvents => new[]
    {
        "sepay.payment.succeeded"
    };

    public SePaySubscriptionWebhookHandler(
        ISubscriptionRepository subscriptionRepository,
        IBillingPaymentRepository billingPaymentRepository,
        IBillingVoucherRepository billingVoucherRepository,
        IUnitOfWork unitOfWork,
        ILogger<SePaySubscriptionWebhookHandler> logger)
    {
        _subscriptionRepository = subscriptionRepository;
        _billingPaymentRepository = billingPaymentRepository;
        _billingVoucherRepository = billingVoucherRepository;
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
        var paidAmount = TryGetDecimal(webhookEvent.Metadata, "Amount");
        var originalAmount = TryGetDecimal(webhookEvent.Metadata, "OriginalAmount");
        webhookEvent.Metadata.TryGetValue("DiscountCode", out var discountCode);
        var discountPercentOff = TryGetDecimal(webhookEvent.Metadata, "DiscountPercentOff");
        var discountAmount = TryGetDecimal(webhookEvent.Metadata, "DiscountAmount");
        var userId = TryGetGuid(webhookEvent.Metadata, "UserId");

        var existing = await _subscriptionRepository.GetByWorkspaceIdAsync(webhookEvent.WorkspaceId.Value);
        var now = DateTime.UtcNow;
        var periodEnd = isYearly ? now.AddYears(1) : now.AddMonths(1);
        Subscription subscriptionForPayment;

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
            subscriptionForPayment = subscription;
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
            subscriptionForPayment = existing;
            _logger.LogInformation("Updated existing SePay subscription to Active for workspace {WorkspaceId} on plan {PlanId}", webhookEvent.WorkspaceId, planId);
        }

        if (!string.IsNullOrWhiteSpace(webhookEvent.EventId)
            && paidAmount.HasValue
            && !await _billingPaymentRepository.ExistsAsync(webhookEvent.Provider, webhookEvent.EventId, cancellationToken))
        {
            var billingPayment = new BillingPayment
            {
                WorkspaceId = webhookEvent.WorkspaceId.Value,
                SubscriptionId = subscriptionForPayment.Id,
                PlanId = planId,
                Provider = webhookEvent.Provider,
                ProviderPaymentId = webhookEvent.EventId,
                ProviderSubscriptionId = webhookEvent.ProviderSubscriptionId,
                Amount = paidAmount.Value,
                OriginalAmount = originalAmount,
                Currency = "VND",
                Interval = isYearly ? "year" : "month",
                DiscountCode = string.IsNullOrWhiteSpace(discountCode) ? null : discountCode,
                DiscountPercentOff = discountPercentOff,
                PaidAtUtc = webhookEvent.EventCreatedAtUtc ?? now
            };

            await _billingPaymentRepository.AddAsync(billingPayment, cancellationToken);

            if (!string.IsNullOrWhiteSpace(discountCode)
                && userId.HasValue
                && originalAmount.HasValue)
            {
                var voucher = await _billingVoucherRepository.GetByCodeAsync(discountCode, cancellationToken);
                if (voucher != null)
                {
                    var resolvedDiscountAmount = discountAmount
                        ?? Math.Max(0m, originalAmount.Value - paidAmount.Value);

                    await _billingVoucherRepository.AddRedemptionAsync(new BillingVoucherRedemption
                    {
                        WorkspaceId = webhookEvent.WorkspaceId.Value,
                        VoucherId = voucher.Id,
                        UserId = userId.Value,
                        PlanId = planId,
                        SubscriptionId = subscriptionForPayment.Id,
                        BillingPaymentId = billingPayment.Id,
                        VoucherCode = voucher.Code,
                        Status = "redeemed",
                        CheckoutSessionId = webhookEvent.ProviderSubscriptionId,
                        PaymentProvider = webhookEvent.Provider,
                        OriginalAmount = originalAmount.Value,
                        DiscountAmount = resolvedDiscountAmount,
                        FinalAmount = paidAmount.Value,
                        Currency = "VND",
                        RedeemedAtUtc = webhookEvent.EventCreatedAtUtc ?? now
                    }, cancellationToken);
                }
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static decimal? TryGetDecimal(IReadOnlyDictionary<string, string> metadata, string key)
    {
        return metadata.TryGetValue(key, out var value) && decimal.TryParse(value, out var parsed)
            ? parsed
            : null;
    }

    private static Guid? TryGetGuid(IReadOnlyDictionary<string, string> metadata, string key)
    {
        return metadata.TryGetValue(key, out var value) && Guid.TryParse(value, out var parsed)
            ? parsed
            : null;
    }
}
