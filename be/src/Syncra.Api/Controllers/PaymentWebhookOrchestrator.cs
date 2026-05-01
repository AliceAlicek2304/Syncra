using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
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
    private readonly IDistributedLockService _lockService;
    private readonly ILogger<PaymentWebhookOrchestrator> _logger;

    public PaymentWebhookOrchestrator(
        AppDbContext db,
        IPaymentProviderResolver paymentProviderResolver,
        IPaymentWebhookEventDispatcher dispatcher,
        IDistributedLockService lockService,
        ILogger<PaymentWebhookOrchestrator> logger)
    {
        _db = db;
        _paymentProviderResolver = paymentProviderResolver;
        _dispatcher = dispatcher;
        _lockService = lockService;
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

            // D-10: Acquire Redis distributed lock (30s timeout)
            var lockKey = $"webhook_lock:{idempotencyKey}";
            await using var distributedLock = await _lockService.TryAcquireAsync(lockKey, TimeSpan.FromSeconds(30), cancellationToken);

            if (distributedLock == null)
            {
                _logger.LogInformation("Webhook event {EventId} is being processed by another instance", eventId);
                return new OkResult();
            }

            // Idempotency check
            var record = await _db.IdempotencyRecords
                .FirstOrDefaultAsync(r => r.Key == idempotencyKey, cancellationToken);

            if (record != null)
            {
                if (record.Status == IdempotencyStatus.Success)
                {
                    _logger.LogInformation("Duplicate webhook event {EventId} already processed successfully", eventId);
                    return new OkResult();
                }

                if (record.Status == IdempotencyStatus.PermanentFailure)
                {
                    _logger.LogInformation("Webhook event {EventId} permanently failed — returning 200 to stop retries", eventId);
                    return new OkResult();
                }

                if (record.Status == IdempotencyStatus.Pending)
                {
                    _logger.LogWarning("Webhook event {EventId} is in Pending state — may be a stale lock. Processing anyway.", eventId);
                }

                // Status is Failure or stale Pending — retry
                record.Status = IdempotencyStatus.Pending;
                await _db.SaveChangesAsync(cancellationToken);
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
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(30),
                    WorkspaceId = webhookEvent.WorkspaceId
                };

                try
                {
                    _db.IdempotencyRecords.Add(record);
                    await _db.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException)
                {
                    // D-11: Unique index violation — another instance created the record
                    _logger.LogInformation("Webhook event {EventId} — duplicate key constraint. Another instance handled it.", eventId);
                    return new OkResult();
                }
            }

            try
            {
                await _dispatcher.DispatchAsync(webhookEvent, cancellationToken);

                record.Status = IdempotencyStatus.Success;
                record.CompletedAtUtc = DateTime.UtcNow;
                record.ResponseStatusCode = 200;
                await _db.SaveChangesAsync(cancellationToken);

                return new OkResult();
            }
            catch (Exception ex)
            {
                // D-02: Increment attempt count
                record.AttemptCount++;

                // D-03: Store structured error info
                record.LastError = JsonSerializer.Serialize(new
                {
                    message = ex.Message,
                    exceptionType = ex.GetType().FullName,
                    truncatedStackTrace = ex.StackTrace?.Length > 500 ? ex.StackTrace[..500] : ex.StackTrace,
                    attemptTimestamp = DateTime.UtcNow.ToString("O")
                });

                if (record.AttemptCount >= 5)
                {
                    // D-02: Permanent failure after 5 attempts — return 200 to stop Stripe retries
                    record.Status = IdempotencyStatus.PermanentFailure;
                    record.ResponseStatusCode = 200;
                    _logger.LogError(ex, "Webhook event {EventId} permanently failed after {AttemptCount} attempts", eventId, record.AttemptCount);
                    await _db.SaveChangesAsync(cancellationToken);
                    return new OkResult();
                }

                // D-01: Return 500 to trigger Stripe retry
                record.Status = IdempotencyStatus.Failure;
                record.ResponseStatusCode = 500;
                _logger.LogError(ex, "Webhook event {EventId} failed (attempt {AttemptCount}/5)", eventId, record.AttemptCount);
                await _db.SaveChangesAsync(cancellationToken);

                return new ObjectResult(new { error = "Webhook processing failed" }) { StatusCode = 500 };
            }
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Unknown payment provider key: {Provider}", provider);
            return new BadRequestObjectResult(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Internal error processing payment webhook for provider {Provider}", provider);
            return new ObjectResult(new { error = "Internal server error" }) { StatusCode = 500 };
        }
    }
}
