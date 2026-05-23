using System.Text.Json;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Jobs;

/// <summary>
/// Hangfire background job that processes a Zernio webhook event identified by <paramref name="webhookEventId"/>.
///
/// Handles:
///   - <c>account.connected</c>: provisions or reactivates a <see cref="SocialAccount"/> with latest metadata.
///   - <c>account.disconnected</c>: soft-deactivates the <see cref="SocialAccount"/> and unschedules pending posts
///     targeting the same platform in the same workspace.
///
/// Decorated with <see cref="AutomaticRetryAttribute"/> to limit retry attempts and avoid infinite loops (T-25-02-02).
/// Error messages are truncated to <see cref="ZernioWebhookEvent.ErrorMessageMaxLength"/> characters before
/// being persisted to prevent DB overflow and internal detail leakage (T-25-02-03).
/// </summary>
[AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
public sealed class ProcessZernioWebhookJob
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProcessZernioWebhookJob> _logger;

    public ProcessZernioWebhookJob(AppDbContext db, ILogger<ProcessZernioWebhookJob> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid webhookEventId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing Zernio webhook job for event {EventId}.", webhookEventId);

        // ── 1. Fetch pending webhook event ──────────────────────────────────
        var webhookEvent = await _db.ZernioWebhookEvents
            .FirstOrDefaultAsync(e => e.Id == webhookEventId, cancellationToken);

        if (webhookEvent == null)
        {
            _logger.LogWarning("Zernio webhook event {EventId} not found — skipping.", webhookEventId);
            return;
        }

        var utcNow = DateTime.UtcNow;

        try
        {
            // ── 2. Parse JSON payload ────────────────────────────────────────
            using var doc = JsonDocument.Parse(webhookEvent.Payload);
            var root = doc.RootElement;

            // Extract account.platform and account.accountId (T-25-02-01: verify workspace via profileId)
            if (!root.TryGetProperty("account", out var accountElement))
            {
                _logger.LogWarning(
                    "Zernio webhook event {EventId} payload missing 'account' object — skipping.",
                    webhookEventId);
                webhookEvent.MarkProcessed(utcNow);
                await _db.SaveChangesAsync(cancellationToken);
                return;
            }

            var platform = accountElement.TryGetProperty("platform", out var platformElement)
                ? platformElement.GetString()?.ToLowerInvariant()
                : null;

            var externalAccountId = accountElement.TryGetProperty("accountId", out var accountIdElement)
                ? accountIdElement.GetString()
                : null;

            var displayName = accountElement.TryGetProperty("displayName", out var displayNameElement)
                ? displayNameElement.GetString() ?? string.Empty
                : string.Empty;

            if (string.IsNullOrWhiteSpace(platform) || string.IsNullOrWhiteSpace(externalAccountId))
            {
                _logger.LogWarning(
                    "Zernio webhook event {EventId} payload missing platform or accountId — skipping.",
                    webhookEventId);
                webhookEvent.MarkProcessed(utcNow);
                await _db.SaveChangesAsync(cancellationToken);
                return;
            }

            // ── 3. Dispatch by event type ────────────────────────────────────
            switch (webhookEvent.EventType)
            {
                case "account.connected":
                    await HandleAccountConnectedAsync(
                        webhookEvent, platform, externalAccountId, displayName, cancellationToken);
                    break;

                case "account.disconnected":
                    await HandleAccountDisconnectedAsync(
                        webhookEvent, platform, externalAccountId, cancellationToken);
                    break;

                default:
                    _logger.LogInformation(
                        "Zernio webhook event {EventId} has unhandled event type '{EventType}' — marking processed.",
                        webhookEventId,
                        webhookEvent.EventType);
                    break;
            }

            // ── 4. Mark event as Processed ───────────────────────────────────
            webhookEvent.MarkProcessed(utcNow);
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Zernio webhook event {EventId} of type '{EventType}' processed successfully.",
                webhookEventId,
                webhookEvent.EventType);
        }
        catch (Exception ex)
        {
            // ── 5. Mark event as Failed, truncate error message (T-25-02-03) ─
            _logger.LogError(
                ex,
                "Zernio webhook event {EventId} processing failed: {Message}",
                webhookEventId,
                ex.Message);

            try
            {
                webhookEvent.MarkFailed(ex.Message, utcNow);
                await _db.SaveChangesAsync(CancellationToken.None);
            }
            catch (Exception saveEx)
            {
                _logger.LogError(
                    saveEx,
                    "Zernio webhook event {EventId}: failed to persist error status.",
                    webhookEventId);
            }

            // Rethrow so Hangfire can schedule a retry (T-25-02-02).
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Provisions a new <see cref="SocialAccount"/> or reactivates + updates an existing one.
    /// Tenant isolation is enforced by scoping the lookup to <see cref="ZernioWebhookEvent.WorkspaceId"/> (T-25-02-01).
    /// </summary>
    private async Task HandleAccountConnectedAsync(
        ZernioWebhookEvent webhookEvent,
        string platform,
        string externalAccountId,
        string displayName,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Handling account.connected for workspace {WorkspaceId}, platform {Platform}, accountId {AccountId}.",
            webhookEvent.WorkspaceId,
            platform,
            externalAccountId);

        // Locate ZernioProfile for the workspace to associate the SocialAccount (T-25-02-01).
        var profile = await _db.ZernioProfiles
            .FirstOrDefaultAsync(
                p => p.WorkspaceId == webhookEvent.WorkspaceId,
                cancellationToken);

        if (profile == null)
        {
            _logger.LogWarning(
                "account.connected: no ZernioProfile found for workspace {WorkspaceId} — cannot create SocialAccount.",
                webhookEvent.WorkspaceId);
            return;
        }

        var account = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                a => a.WorkspaceId == webhookEvent.WorkspaceId
                  && a.Platform == platform
                  && a.ExternalAccountId == externalAccountId,
                cancellationToken);

        if (account == null)
        {
            // New account — provision it.
            var newAccount = SocialAccount.Create(
                workspaceId: webhookEvent.WorkspaceId,
                zernioProfileId: profile.Id,
                externalAccountId: externalAccountId,
                platform: platform,
                displayName: displayName);

            _db.SocialAccounts.Add(newAccount);

            _logger.LogInformation(
                "account.connected: created new SocialAccount for workspace {WorkspaceId}, platform {Platform}.",
                webhookEvent.WorkspaceId,
                platform);
        }
        else
        {
            // Existing account — reactivate and refresh metadata.
            account.Reactivate();
            account.Update(displayName, account.AvatarUrl);

            _logger.LogInformation(
                "account.connected: reactivated existing SocialAccount {AccountId} for workspace {WorkspaceId}.",
                account.Id,
                webhookEvent.WorkspaceId);
        }
    }

    /// <summary>
    /// Soft-deactivates the <see cref="SocialAccount"/> and unschedules all pending posts
    /// targeting the same platform in the same workspace.
    /// </summary>
    private async Task HandleAccountDisconnectedAsync(
        ZernioWebhookEvent webhookEvent,
        string platform,
        string externalAccountId,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Handling account.disconnected for workspace {WorkspaceId}, platform {Platform}, accountId {AccountId}.",
            webhookEvent.WorkspaceId,
            platform,
            externalAccountId);

        // ── a. Deactivate the SocialAccount (T-25-02-01: tenant-scoped lookup) ─
        var account = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                a => a.WorkspaceId == webhookEvent.WorkspaceId
                  && a.Platform == platform
                  && a.ExternalAccountId == externalAccountId,
                cancellationToken);

        if (account == null)
        {
            _logger.LogWarning(
                "account.disconnected: SocialAccount not found for workspace {WorkspaceId}, platform {Platform}, accountId {AccountId} — skipping deactivation.",
                webhookEvent.WorkspaceId,
                platform,
                externalAccountId);
        }
        else
        {
            account.Deactivate();

            _logger.LogInformation(
                "account.disconnected: deactivated SocialAccount {AccountId} for workspace {WorkspaceId}.",
                account.Id,
                webhookEvent.WorkspaceId);
        }

        // ── b. Unschedule pending posts targeting this platform ──────────────
        // Posts link to platforms via PostPlatformTarget (platform string).
        var scheduledPosts = await _db.Posts
            .Include(p => p.PlatformTargets)
            .Where(p => p.WorkspaceId == webhookEvent.WorkspaceId
                     && p.Status == PostStatus.Scheduled
                     && p.PlatformTargets.Any(t => t.Platform == platform))
            .ToListAsync(cancellationToken);

        foreach (var post in scheduledPosts)
        {
            post.Unschedule();

            _logger.LogInformation(
                "account.disconnected: unscheduled post {PostId} in workspace {WorkspaceId} (platform {Platform}).",
                post.Id,
                webhookEvent.WorkspaceId,
                platform);
        }

        if (scheduledPosts.Count > 0)
        {
            _logger.LogInformation(
                "account.disconnected: unscheduled {Count} post(s) for workspace {WorkspaceId}, platform {Platform}.",
                scheduledPosts.Count,
                webhookEvent.WorkspaceId,
                platform);
        }
    }
}
