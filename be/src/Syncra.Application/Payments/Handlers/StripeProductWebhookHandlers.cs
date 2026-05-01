using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Payments;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Payments.Handlers;

public sealed class StripeProductWebhookHandlers : IPaymentWebhookHandler
{
    private readonly IPlanRepository _planRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<StripeProductWebhookHandlers> _logger;

    public string[] SupportedEvents => new[] { "product.created", "product.updated", "product.deleted" };

    public StripeProductWebhookHandlers(
        IPlanRepository planRepository,
        IUnitOfWork unitOfWork,
        ILogger<StripeProductWebhookHandlers> logger)
    {
        _planRepository = planRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task HandleAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
    {
        if (!webhookEvent.Metadata.TryGetValue("ProductId", out var productId))
        {
            _logger.LogWarning("Missing ProductId in webhook metadata for event {EventId}", webhookEvent.EventId);
            return;
        }

        var plan = await _planRepository.GetByStripeProductIdAsync(productId, cancellationToken);

        // Timestamp guard (D-05, D-06): skip if we already have a newer event
        if (plan != null
            && plan.LastEventTimestampUtc.HasValue
            && webhookEvent.EventCreatedAtUtc.HasValue
            && webhookEvent.EventCreatedAtUtc.Value < plan.LastEventTimestampUtc.Value)
        {
            _logger.LogInformation(
                "Skipping stale product event {EventId} — local timestamp {Local} > event timestamp {Event}",
                webhookEvent.EventId, plan.LastEventTimestampUtc, webhookEvent.EventCreatedAtUtc);
            return;
        }

        if (webhookEvent.EventType == "product.deleted")
        {
            if (plan != null)
            {
                plan.IsActive = false;
                plan.LastEventTimestampUtc = webhookEvent.EventCreatedAtUtc;
                await _planRepository.UpdateAsync(plan);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            return;
        }

        var name = webhookEvent.Metadata.TryGetValue("Name", out var n) ? n : "Unknown";
        var description = webhookEvent.Metadata.TryGetValue("Description", out var d) ? d : null;
        var activeStr = webhookEvent.Metadata.TryGetValue("Active", out var a) ? a : "False";
        bool.TryParse(activeStr, out var isActive);
        var code = webhookEvent.Metadata.TryGetValue("Code", out var c) ? c : name.ToUpperInvariant().Replace(" ", "_");

        if (plan == null)
        {
            plan = new Plan
            {
                StripeProductId = productId,
                Name = name,
                Description = description,
                IsActive = isActive,
                Code = code,
                MaxMembers = 1,
                MaxSocialAccounts = 1,
                MaxScheduledPostsPerMonth = 10
            };
            await _planRepository.AddAsync(plan);
        }
        else
        {
            plan.Name = name;
            plan.Description = description;
            plan.IsActive = isActive;
            plan.Code = code;
            await _planRepository.UpdateAsync(plan);
        }

        plan.LastEventTimestampUtc = webhookEvent.EventCreatedAtUtc;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
