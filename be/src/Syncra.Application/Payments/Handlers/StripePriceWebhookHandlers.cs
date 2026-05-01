using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Payments;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Payments.Handlers;

public sealed class StripePriceWebhookHandlers : IPaymentWebhookHandler
{
    private readonly IPlanRepository _planRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<StripePriceWebhookHandlers> _logger;

    public string[] SupportedEvents => new[] { "price.created", "price.updated", "price.deleted" };

    public StripePriceWebhookHandlers(
        IPlanRepository planRepository,
        IUnitOfWork unitOfWork,
        ILogger<StripePriceWebhookHandlers> logger)
    {
        _planRepository = planRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task HandleAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
    {
        if (!webhookEvent.Metadata.TryGetValue("PriceId", out var priceId) ||
            !webhookEvent.Metadata.TryGetValue("ProductId", out var productId))
        {
            _logger.LogWarning("Missing PriceId or ProductId in webhook metadata for event {EventId}", webhookEvent.EventId);
            return;
        }

        var plan = await _planRepository.GetByStripeProductIdAsync(productId, cancellationToken);
        if (plan == null)
        {
            _logger.LogWarning("No plan found for ProductId {ProductId} from price event {EventId}", productId, webhookEvent.EventId);
            return;
        }

        // Timestamp guard (D-05, D-06): skip if we already have a newer event
        if (plan.LastEventTimestampUtc.HasValue
            && webhookEvent.EventCreatedAtUtc.HasValue
            && webhookEvent.EventCreatedAtUtc.Value < plan.LastEventTimestampUtc.Value)
        {
            _logger.LogInformation(
                "Skipping stale price event {EventId} — local timestamp {Local} > event timestamp {Event}",
                webhookEvent.EventId, plan.LastEventTimestampUtc, webhookEvent.EventCreatedAtUtc);
            return;
        }

        if (webhookEvent.EventType == "price.deleted")
        {
            if (plan.StripeMonthlyPriceId == priceId)
                plan.StripeMonthlyPriceId = null;
            if (plan.StripeYearlyPriceId == priceId)
                plan.StripeYearlyPriceId = null;

            plan.LastEventTimestampUtc = webhookEvent.EventCreatedAtUtc;
            await _planRepository.UpdateAsync(plan);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var unitAmountStr = webhookEvent.Metadata.TryGetValue("UnitAmount", out var ua) ? ua : "0";
        var interval = webhookEvent.Metadata.TryGetValue("Interval", out var i) ? i : "month";
        var currency = webhookEvent.Metadata.TryGetValue("Currency", out var c) ? c.ToLowerInvariant() : "usd";
        
        if (!decimal.TryParse(unitAmountStr, out var unitAmount))
            unitAmount = 0;

        var isZeroDecimal = currency == "vnd" || currency == "jpy" || currency == "krw"; // Add others if necessary
        var priceDecimal = isZeroDecimal ? unitAmount : unitAmount / 100m;

        if (interval == "year")
        {
            plan.PriceYearly = priceDecimal;
            plan.StripeYearlyPriceId = priceId;
        }
        else
        {
            plan.PriceMonthly = priceDecimal;
            plan.StripeMonthlyPriceId = priceId;
        }

        plan.LastEventTimestampUtc = webhookEvent.EventCreatedAtUtc;
        await _planRepository.UpdateAsync(plan);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
