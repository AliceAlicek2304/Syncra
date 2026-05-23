using System.Text.Json;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Syncra.Api.Filters;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Jobs;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

/// <summary>
/// Webhook intake endpoint for Zernio platform events.
///
/// All requests are pre-screened by <see cref="ZernioWebhookSignatureFilter"/> which verifies
/// the HMAC-SHA256 signature before this controller action is invoked.
///
/// On receipt the controller:
///   1. Validates the X-Zernio-Event-Id header is a well-formed Guid.
///   2. Acquires a Redis distributed lock keyed on the event ID to prevent duplicate concurrent delivery (T-25-01-03).
///   3. Checks the database for an existing event record — returns 200 immediately if already recorded.
///   4. Resolves the workspace by locating the ZernioProfile matching the payload's account.profileId.
///   5. Persists a ZernioWebhookEvent in Pending status.
///   6. Enqueues ProcessZernioWebhookJob to Hangfire and returns 200 OK immediately (T-25-01-02).
/// </summary>
[ApiController]
[Route("api/zernio/webhook")]
[ServiceFilter(typeof(ZernioWebhookSignatureFilter))]
public sealed class ZernioWebhookController : ControllerBase
{
    private const string EventIdHeader = "X-Zernio-Event-Id";
    private const string EventTypeHeader = "X-Zernio-Event-Type";
    private const string LockKeyPrefix = "webhook_lock:zernio_";
    private static readonly TimeSpan LockTimeout = TimeSpan.FromSeconds(30);

    private readonly AppDbContext _db;
    private readonly IDistributedLockService _lockService;
    private readonly IBackgroundJobClient _backgroundJobs;
    private readonly ILogger<ZernioWebhookController> _logger;

    public ZernioWebhookController(
        AppDbContext db,
        IDistributedLockService lockService,
        IBackgroundJobClient backgroundJobs,
        ILogger<ZernioWebhookController> logger)
    {
        _db = db;
        _lockService = lockService;
        _backgroundJobs = backgroundJobs;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> ReceiveWebhookAsync(CancellationToken cancellationToken)
    {
        // ── 1. Validate X-Zernio-Event-Id header ────────────────────────────
        if (!Request.Headers.TryGetValue(EventIdHeader, out var eventIdHeaderValue)
            || !Guid.TryParse(eventIdHeaderValue, out var eventId))
        {
            _logger.LogWarning("Zernio webhook rejected: invalid or missing {Header} header.", EventIdHeader);
            return BadRequest($"Invalid or missing {EventIdHeader} header.");
        }

        var eventType = Request.Headers.TryGetValue(EventTypeHeader, out var eventTypeHeaderValue)
            ? eventTypeHeaderValue.ToString()
            : "unknown";

        // ── 2. Acquire Redis distributed lock (T-25-01-03) ──────────────────
        var lockKey = $"{LockKeyPrefix}{eventId}";
        await using var distributedLock = await _lockService.TryAcquireAsync(lockKey, LockTimeout, cancellationToken);

        if (distributedLock == null || !distributedLock.IsAcquired)
        {
            _logger.LogInformation(
                "Zernio webhook lock contention for event {EventId} — another instance is processing it.",
                eventId);
            // Return 200 to stop Zernio from retrying an event that is already being handled.
            return Ok();
        }

        // ── 3. Idempotency check: has this event already been recorded? ──────
        var alreadyRecorded = await _db.ZernioWebhookEvents
            .AnyAsync(e => e.Id == eventId, cancellationToken);

        if (alreadyRecorded)
        {
            _logger.LogInformation(
                "Zernio webhook event {EventId} already recorded — returning 200 to stop retries.",
                eventId);
            return Ok();
        }

        // ── 4. Parse raw body to extract account.profileId ──────────────────
        Request.Body.Position = 0;
        JsonElement body;
        try
        {
            using var doc = await JsonDocument.ParseAsync(Request.Body, cancellationToken: cancellationToken);
            body = doc.RootElement.Clone();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Zernio webhook event {EventId} has unparseable JSON body.", eventId);
            return BadRequest("Invalid JSON payload.");
        }

        string? profileId = null;
        if (body.TryGetProperty("account", out var accountElement)
            && accountElement.TryGetProperty("profileId", out var profileIdElement))
        {
            profileId = profileIdElement.GetString();
        }

        if (string.IsNullOrWhiteSpace(profileId))
        {
            _logger.LogWarning(
                "Zernio webhook event {EventId} missing account.profileId — cannot resolve workspace.",
                eventId);
            // Return 200 to prevent Zernio from retrying unresolvable events.
            return Ok();
        }

        // ── 5. Resolve workspace via ZernioProfile ───────────────────────────
        var profile = await _db.ZernioProfiles
            .FirstOrDefaultAsync(p => p.ZernioProfileId == profileId, cancellationToken);

        if (profile == null)
        {
            _logger.LogWarning(
                "Zernio webhook event {EventId}: no ZernioProfile found for profileId {ProfileId} — returning 200 to stop retries.",
                eventId,
                profileId);
            return Ok();
        }

        // ── 6. Persist webhook event in Pending status ───────────────────────
        var rawBody = body.GetRawText();
        var webhookEvent = ZernioWebhookEvent.Create(profile.WorkspaceId, eventType, rawBody);
        webhookEvent.Id = eventId;

        try
        {
            _db.ZernioWebhookEvents.Add(webhookEvent);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique constraint violation — another instance already persisted this event.
            _logger.LogInformation(
                "Zernio webhook event {EventId} — duplicate key constraint hit; another instance handled it.",
                eventId);
            return Ok();
        }

        // ── 7. Enqueue background job and return 200 OK immediately (T-25-01-02) ──
        _backgroundJobs.Enqueue<ProcessZernioWebhookJob>(
            job => job.ExecuteAsync(eventId, CancellationToken.None));

        _logger.LogInformation(
            "Zernio webhook event {EventId} of type {EventType} enqueued for processing.",
            eventId,
            eventType);

        return Ok();
    }
}
