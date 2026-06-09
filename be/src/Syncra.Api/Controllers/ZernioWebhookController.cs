using System.Text.Json;
using System.Text.RegularExpressions;
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
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<ZernioWebhookController> _logger;

    public ZernioWebhookController(
        AppDbContext db,
        IDistributedLockService lockService,
        IBackgroundJobClient backgroundJobs,
        IZernioClient zernioClient,
        ILogger<ZernioWebhookController> logger)
    {
        _db = db;
        _lockService = lockService;
        _backgroundJobs = backgroundJobs;
        _zernioClient = zernioClient;
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

        // ── 2. Acquire Redis distributed lock (T-25-01-03) ──────────────────
        var lockKey = $"{LockKeyPrefix}{eventId}";
        await using var distributedLock = await _lockService.TryAcquireAsync(lockKey, LockTimeout, cancellationToken);

        if (distributedLock == null || !distributedLock.IsAcquired)
        {
            _logger.LogInformation(
                "Zernio webhook lock contention for event {EventId} — another instance is processing it.",
                eventId);
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

        // ── 4. Parse raw body ──────────────────────────────────────────────
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

        // ── 5. Extract event type from header, fallback to body's 'event' field ──
        var eventType = Request.Headers.TryGetValue(EventTypeHeader, out var eventTypeHeaderValue)
            ? eventTypeHeaderValue.ToString()
            : "unknown";

        if (eventType == "unknown" && body.TryGetProperty("event", out var eventElement))
        {
            eventType = eventElement.GetString() ?? "unknown";
        }

        // ── 6. Extract account.profileId ──────────────────────────────────
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
            return Ok();
        }

        // ── 7. Resolve workspace via ZernioProfile ───────────────────────────
        var profile = await _db.ZernioProfiles
            .FirstOrDefaultAsync(p => p.ZernioProfileId == profileId, cancellationToken);

        if (profile == null)
        {
            profile = await AutoProvisionProfileAsync(profileId, cancellationToken);

            if (profile == null)
            {
                _logger.LogWarning(
                    "Zernio webhook event {EventId}: no ZernioProfile found for profileId {ProfileId} and auto-provision failed — returning 200.",
                    eventId,
                    profileId);
                return Ok();
            }

            _logger.LogInformation(
                "Zernio webhook event {EventId}: auto-provisioned ZernioProfile {ProfileId} for workspace {WorkspaceId}.",
                eventId,
                profileId,
                profile.WorkspaceId);
        }

        // ── 8. Persist webhook event in Pending status ───────────────────────
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
            _logger.LogInformation(
                "Zernio webhook event {EventId} — duplicate key constraint hit; another instance handled it.",
                eventId);
            return Ok();
        }

        // ── 9. Enqueue background job and return 200 OK immediately (T-25-01-02) ──
        _backgroundJobs.Enqueue<ProcessZernioWebhookJob>(
            job => job.ExecuteAsync(eventId, CancellationToken.None));

        _logger.LogInformation(
            "Zernio webhook event {EventId} of type {EventType} enqueued for processing.",
            eventId,
            eventType);

        return Ok();
    }

    private async Task<ZernioProfile?> AutoProvisionProfileAsync(string profileId, CancellationToken cancellationToken)
    {
        try
        {
            var profileDto = await _zernioClient.GetProfileAsync(profileId, cancellationToken);
            if (profileDto == null) return null;

            var user = await _db.Users.FirstOrDefaultAsync(cancellationToken);
            if (user == null)
            {
                _logger.LogWarning("Cannot auto-provision: no user found in database to own the new workspace.");
                return null;
            }

            var ownerUserId = user.Id;
            var name = profileDto.Name;
            var slug = GenerateSlug(name);

            var existingSlug = await _db.Workspaces
                .AnyAsync(w => w.Slug == slug, cancellationToken);
            if (existingSlug)
            {
                slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";
            }

            var workspace = Workspace.Create(ownerUserId, name, slug);
            workspace.AddMember(ownerUserId, "owner");

            _db.Workspaces.Add(workspace);
            await _db.SaveChangesAsync(cancellationToken);

            var profile = ZernioProfile.Create(
                workspace.Id,
                profileDto.Id,
                profileDto.Name,
                "zernio");

            _db.ZernioProfiles.Add(profile);
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Auto-provisioned new workspace {WorkspaceId} ({Name}) with ZernioProfile {ProfileId}.",
                workspace.Id,
                name,
                profileId);

            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to auto-provision workspace for ZernioProfile {ProfileId}.", profileId);
            return null;
        }
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = Regex.Replace(slug, @"-{2,}", "-").Trim('-');
        return slug.Length > 0 ? slug : "workspace";
    }
}
