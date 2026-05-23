using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Jobs;

/// <summary>
/// Hangfire background job that processes a Zernio webhook event identified by <paramref name="eventId"/>.
///
/// Fetches the pending <see cref="ZernioWebhookEvent"/> from the database, dispatches it to the
/// appropriate handler based on its event type, and marks it as processed or failed.
///
/// Implementation details are delivered in plan 25-02-webhook-processing.
/// </summary>
public sealed class ProcessZernioWebhookJob
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProcessZernioWebhookJob> _logger;

    public ProcessZernioWebhookJob(AppDbContext db, ILogger<ProcessZernioWebhookJob> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid eventId, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing Zernio webhook job for event {EventId}.", eventId);

        var webhookEvent = await _db.ZernioWebhookEvents
            .FirstOrDefaultAsync(e => e.Id == eventId, cancellationToken);

        if (webhookEvent == null)
        {
            _logger.LogWarning("Zernio webhook event {EventId} not found — skipping.", eventId);
            return;
        }

        // Full processing logic is implemented in plan 25-02.
        _logger.LogInformation(
            "Zernio webhook event {EventId} of type {EventType} is queued for processing.",
            webhookEvent.Id,
            webhookEvent.EventType);
    }
}
