using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Interfaces;
using Syncra.Application.Payments;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

public sealed class PaymentWebhookOrchestrator
{
    private readonly AppDbContext _db;
    private readonly IPaymentProviderResolver _paymentProviderResolver;
    private readonly IPaymentWebhookEventDispatcher _dispatcher;
    private readonly ILogger<PaymentWebhookOrchestrator> _logger;

    public PaymentWebhookOrchestrator(
        AppDbContext db,
        IPaymentProviderResolver paymentProviderResolver,
        IPaymentWebhookEventDispatcher dispatcher,
        ILogger<PaymentWebhookOrchestrator> logger)
    {
        _db = db;
        _paymentProviderResolver = paymentProviderResolver;
        _dispatcher = dispatcher;
        _logger = logger;
    }

    public async Task<IActionResult> ProcessAsync(
        string provider,
        string payload,
        IReadOnlyDictionary<string, string> headers,
        string endpoint,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providerKey = provider.Trim().ToLowerInvariant();
            var paymentProvider = _paymentProviderResolver.GetRequiredProvider(providerKey);

            var parseResult = await paymentProvider.ParseWebhookAsync(
                new PaymentWebhookRequest(providerKey, payload, headers, endpoint),
                cancellationToken);

            if (!parseResult.IsValid || parseResult.WebhookEvent == null)
            {
                return new BadRequestObjectResult(new { error = parseResult.Error ?? "Invalid webhook payload." });
            }

            var webhookEvent = parseResult.WebhookEvent;
            var eventId = webhookEvent.EventId;
            var idempotencyKey = $"{providerKey}_event_{eventId}";

            var record = await _db.IdempotencyRecords
                .FirstOrDefaultAsync(r => r.Key == idempotencyKey, cancellationToken);

            if (record != null)
            {
                if (record.Status == IdempotencyStatus.Pending)
                {
                    _logger.LogWarning("Duplicate payment webhook event {EventId} for provider {Provider} is currently being processed.", eventId, providerKey);
                    return new ConflictObjectResult("Event processing in progress");
                }

                if (record.Status == IdempotencyStatus.Success)
                {
                    _logger.LogInformation("Duplicate payment webhook event {EventId} for provider {Provider} was already processed.", eventId, providerKey);
                    return new OkResult();
                }

                if (record.Status == IdempotencyStatus.Failure)
                {
                    _logger.LogInformation("Retrying failed payment webhook event {EventId} for provider {Provider}.", eventId, providerKey);
                    record.Status = IdempotencyStatus.Pending;
                }
            }
            else
            {
                record = new IdempotencyRecord
                {
                    Key = idempotencyKey,
                    RequestHash = eventId,
                    Endpoint = endpoint,
                    Method = "POST",
                    Status = IdempotencyStatus.Pending,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                    WorkspaceId = webhookEvent.WorkspaceId
                };

                _db.IdempotencyRecords.Add(record);
            }

            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                await _dispatcher.DispatchAsync(webhookEvent, cancellationToken);

                record.Status = IdempotencyStatus.Success;
                record.CompletedAtUtc = DateTime.UtcNow;
                record.ResponseStatusCode = 200;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment webhook event {EventId} for provider {Provider}.", eventId, providerKey);
                record.Status = IdempotencyStatus.Failure;
                record.ResponseBody = ex.Message;
                throw;
            }
            finally
            {
                await _db.SaveChangesAsync(cancellationToken);
            }

            return new OkResult();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Unknown payment provider key: {Provider}", provider);
            return new BadRequestObjectResult(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Internal error processing payment webhook for provider {Provider}", provider);
            return new ObjectResult(ex.ToString()) { StatusCode = 500 };
        }
    }
}
