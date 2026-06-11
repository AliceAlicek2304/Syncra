using System.Text.Json;
using System.Linq;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;
using Syncra.Application.Interfaces;

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
    private readonly IPostStatusNotifier _postStatusNotifier;
    private readonly IInboxNotifier _inboxNotifier;
    private readonly IInboxCommentListCacheService? _listCache;

    public ProcessZernioWebhookJob(
        AppDbContext db,
        ILogger<ProcessZernioWebhookJob> logger,
        IPostStatusNotifier postStatusNotifier,
        IInboxNotifier inboxNotifier,
        IInboxCommentListCacheService? listCache = null)
    {
        _db = db;
        _logger = logger;
        _postStatusNotifier = postStatusNotifier;
        _inboxNotifier = inboxNotifier;
        _listCache = listCache;
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

            if (webhookEvent.EventType.StartsWith("account."))
            {
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

                var accountProfileId = accountElement.TryGetProperty("profileId", out var accountProfileIdElement)
                    ? accountProfileIdElement.GetString()
                    : null;

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
                            webhookEvent, platform, externalAccountId, displayName, accountProfileId, cancellationToken);
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
            }
            else if (webhookEvent.EventType.StartsWith("post."))
            {
                switch (webhookEvent.EventType)
                {
                    case "post.scheduled":
                        await HandlePostScheduledAsync(webhookEvent, root, cancellationToken);
                        break;

                    case "post.published":
                        await HandlePostPublishedAsync(webhookEvent, root, cancellationToken);
                        break;

                    case "post.failed":
                        await HandlePostFailedAsync(webhookEvent, root, cancellationToken);
                        break;

                    case "post.partial":
                        await HandlePostPartialAsync(webhookEvent, root, cancellationToken);
                        break;

                    case "post.cancelled":
                        await HandlePostCancelledAsync(webhookEvent, root, cancellationToken);
                        break;

                    case "post.platform.published":
                        await HandlePostPlatformPublishedAsync(webhookEvent, root, cancellationToken);
                        break;

                    case "post.platform.failed":
                        await HandlePostPlatformFailedAsync(webhookEvent, root, cancellationToken);
                        break;

                    default:
                        _logger.LogInformation(
                            "Zernio webhook event {EventId} has unhandled event type '{EventType}' — marking processed.",
                            webhookEventId,
                            webhookEvent.EventType);
                        webhookEvent.MarkProcessed(utcNow);
                        await _db.SaveChangesAsync(cancellationToken);
                        break;
                }
            }
            else if (webhookEvent.EventType is "comment.received" or "review.new" or "review.updated")
            {
                if (!root.TryGetProperty("account", out var inboxAccount))
                {
                    _logger.LogWarning(
                        "Zernio webhook event {EventId} ('{EventType}') payload missing 'account' object — skipping.",
                        webhookEventId,
                        webhookEvent.EventType);
                    webhookEvent.MarkProcessed(utcNow);
                    await _db.SaveChangesAsync(cancellationToken);
                    return;
                }

                var externalAccountId = inboxAccount.TryGetProperty("id", out var acctIdElem)
                    ? acctIdElem.GetString()
                    : null;

                if (string.IsNullOrWhiteSpace(externalAccountId))
                {
                    _logger.LogWarning(
                        "Zernio webhook event {EventId} ('{EventType}') payload missing account.id — skipping.",
                        webhookEventId,
                        webhookEvent.EventType);
                    webhookEvent.MarkProcessed(utcNow);
                    await _db.SaveChangesAsync(cancellationToken);
                    return;
                }

                switch (webhookEvent.EventType)
                {
                    case "comment.received":
                        await HandleCommentReceivedAsync(
                            webhookEvent, root, externalAccountId, cancellationToken);
                        break;

                    case "review.new":
                    case "review.updated":
                        await HandleReviewNewAsync(
                            webhookEvent, root, externalAccountId, cancellationToken);
                        break;

                    default:
                        _logger.LogInformation(
                            "Zernio webhook event {EventId} has unhandled event type '{EventType}' — marking processed.",
                            webhookEventId,
                            webhookEvent.EventType);
                        webhookEvent.MarkProcessed(utcNow);
                        await _db.SaveChangesAsync(cancellationToken);
                        break;
                }

                webhookEvent.MarkProcessed(utcNow);
                await _db.SaveChangesAsync(cancellationToken);
            }
            else if (webhookEvent.EventType.StartsWith("message."))
            {
                if (!root.TryGetProperty("account", out var msgAccount))
                {
                    _logger.LogWarning(
                        "Zernio webhook event {EventId} ('{EventType}') payload missing 'account' object — skipping.",
                        webhookEventId,
                        webhookEvent.EventType);
                    webhookEvent.MarkProcessed(utcNow);
                    await _db.SaveChangesAsync(cancellationToken);
                    return;
                }

                var externalAccountId = msgAccount.TryGetProperty("id", out var acctIdElem)
                    ? acctIdElem.GetString()
                    : null;

                if (string.IsNullOrWhiteSpace(externalAccountId))
                {
                    _logger.LogWarning(
                        "Zernio webhook event {EventId} ('{EventType}') payload missing account.id — skipping.",
                        webhookEventId,
                        webhookEvent.EventType);
                    webhookEvent.MarkProcessed(utcNow);
                    await _db.SaveChangesAsync(cancellationToken);
                    return;
                }

                switch (webhookEvent.EventType)
                {
                    case "message.received":
                        await HandleMessageReceivedAsync(
                            webhookEvent, root, externalAccountId, cancellationToken);
                        break;

                    default:
                        _logger.LogInformation(
                            "Zernio webhook event {EventId} has unhandled event type '{EventType}' — marking processed.",
                            webhookEventId,
                            webhookEvent.EventType);
                        webhookEvent.MarkProcessed(utcNow);
                        await _db.SaveChangesAsync(cancellationToken);
                        break;
                }

                webhookEvent.MarkProcessed(utcNow);
                await _db.SaveChangesAsync(cancellationToken);
            }
            else
            {
                _logger.LogInformation(
                    "Zernio webhook event {EventId} has unhandled event type '{EventType}' — marking processed.",
                    webhookEventId,
                    webhookEvent.EventType);
                webhookEvent.MarkProcessed(utcNow);
                await _db.SaveChangesAsync(cancellationToken);
            }

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
        string? profileId,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Handling account.connected for workspace {WorkspaceId}, platform {Platform}, accountId {AccountId}.",
            webhookEvent.WorkspaceId,
            platform,
            externalAccountId);

        // Locate ZernioProfile by profileId from payload, fallback to workspaceId (T-25-02-01).
        ZernioProfile? profile = null;
        if (!string.IsNullOrWhiteSpace(profileId))
        {
            profile = await _db.ZernioProfiles
                .FirstOrDefaultAsync(p => p.ZernioProfileId == profileId, cancellationToken);
        }

        if (profile == null)
        {
            profile = await _db.ZernioProfiles
                .FirstOrDefaultAsync(
                    p => p.WorkspaceId == webhookEvent.WorkspaceId,
                    cancellationToken);
        }

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

    private async Task HandlePostScheduledAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioPostId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.scheduled) payload missing post.id — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        if (PostStatusTransitions.IsTerminal(post.Status))
        {
            _logger.LogInformation("Post {PostId} is already in terminal state {Status} — skipping post.scheduled.", post.Id, post.Status);
            return;
        }

        post.TransitionTo(PostStatus.Scheduled);
        
        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    private async Task HandlePostPublishedAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioPostId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.published) payload missing post.id — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        if (PostStatusTransitions.IsTerminal(post.Status))
        {
            _logger.LogInformation("Post {PostId} is already in terminal state {Status} — skipping post.published.", post.Id, post.Status);
            return;
        }

        if (post.Status == PostStatus.Draft || post.Status == PostStatus.Scheduled)
        {
            post.MarkPublishAttempt(DateTime.UtcNow);
        }

        post.MarkZernioPublished(DateTime.UtcNow);

        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    private async Task HandlePostFailedAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioPostId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.failed) payload missing post.id — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        if (PostStatusTransitions.IsTerminal(post.Status))
        {
            _logger.LogInformation("Post {PostId} is already in terminal state {Status} — skipping post.failed.", post.Id, post.Status);
            return;
        }

        if (post.Status == PostStatus.Draft || post.Status == PostStatus.Scheduled)
        {
            post.MarkPublishAttempt(DateTime.UtcNow);
        }

        string? error = null;
        if (root.TryGetProperty("post", out var pElement) && pElement.TryGetProperty("error", out var errorElement))
        {
            error = errorElement.GetString();
        }

        post.MarkZernioFailed(DateTime.UtcNow, error);

        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    private async Task HandlePostPartialAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioPostId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.partial) payload missing post.id — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        if (PostStatusTransitions.IsTerminal(post.Status))
        {
            _logger.LogInformation("Post {PostId} is already in terminal state {Status} — skipping post.partial.", post.Id, post.Status);
            return;
        }

        if (post.Status == PostStatus.Partial)
        {
            _logger.LogInformation("Post {PostId} is already Partial — skipping status transition.", post.Id);
            webhookEvent.MarkProcessed(DateTime.UtcNow);
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        if (post.Status == PostStatus.Draft || post.Status == PostStatus.Scheduled)
        {
            post.MarkPublishAttempt(DateTime.UtcNow);
        }

        int targetCount = 0;
        if (root.TryGetProperty("post", out var postElem) && postElem.TryGetProperty("platforms", out var platformsElem) && platformsElem.ValueKind == JsonValueKind.Array)
        {
            targetCount = platformsElem.GetArrayLength();
        }
        if (targetCount == 0)
        {
            targetCount = post.ZernioTargetCount > 0 ? post.ZernioTargetCount : post.PlatformTargets.Count;
        }

        post.MarkPublishPartial(DateTime.UtcNow, zernioPostId, targetCount);

        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    private async Task HandlePostCancelledAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioPostId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.cancelled) payload missing post.id — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        if (post.IsDeleted)
        {
            _logger.LogInformation("Post {PostId} is already marked as deleted/cancelled.", post.Id);
            return;
        }

        if (post.Status == PostStatus.Failed)
        {
            _logger.LogInformation("Post {PostId} is already in Failed state (unpublished only) — skipping deletion.", post.Id);
            webhookEvent.MarkProcessed(DateTime.UtcNow);
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        post.MarkAsDeleted();

        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    private async Task HandlePostPlatformPublishedAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        var platformName = root.GetProperty("platform").GetProperty("name").GetString()?.ToLowerInvariant();
        var zernioAccountId = root.GetProperty("account").GetProperty("accountId").GetString();

        if (string.IsNullOrWhiteSpace(zernioPostId) || string.IsNullOrWhiteSpace(platformName) || string.IsNullOrWhiteSpace(zernioAccountId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.platform.published) payload missing required keys — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        var target = post.PlatformTargets.FirstOrDefault(t => t.Platform == platformName && t.ZernioAccountId == zernioAccountId);
        if (target == null)
        {
            _logger.LogWarning("No PostPlatformTarget matched ({Platform}, {AccountId}) for post {PostId} — skipping.", platformName, zernioAccountId, post.Id);
            return;
        }

        var externalPostId = root.GetProperty("platform").TryGetProperty("platformPostId", out var pid) ? pid.GetString() : null;
        var publishedUrl = root.GetProperty("platform").TryGetProperty("publishedUrl", out var url) ? url.GetString() : null;

        target.MarkPublished(externalPostId ?? string.Empty, publishedUrl, DateTime.UtcNow);

        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    private async Task HandlePostPlatformFailedAsync(ZernioWebhookEvent webhookEvent, JsonElement root, CancellationToken cancellationToken)
    {
        var zernioPostId = root.GetProperty("post").GetProperty("id").GetString();
        var platformName = root.GetProperty("platform").GetProperty("name").GetString()?.ToLowerInvariant();
        var zernioAccountId = root.GetProperty("account").GetProperty("accountId").GetString();

        if (string.IsNullOrWhiteSpace(zernioPostId) || string.IsNullOrWhiteSpace(platformName) || string.IsNullOrWhiteSpace(zernioAccountId))
        {
            _logger.LogWarning("Zernio webhook event {EventId} (post.platform.failed) payload missing required keys — skipping.", webhookEvent.Id);
            return;
        }

        var post = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.ZernioPostId == zernioPostId && p.WorkspaceId == webhookEvent.WorkspaceId, cancellationToken);

        if (post == null)
        {
            _logger.LogWarning("Post not found for ZernioPostId {ZernioPostId} in workspace {WorkspaceId} — will retry.", zernioPostId, webhookEvent.WorkspaceId);
            throw new InvalidOperationException("post_not_yet_persisted");
        }

        var target = post.PlatformTargets.FirstOrDefault(t => t.Platform == platformName && t.ZernioAccountId == zernioAccountId);
        if (target == null)
        {
            _logger.LogWarning("No PostPlatformTarget matched ({Platform}, {AccountId}) for post {PostId} — skipping.", platformName, zernioAccountId, post.Id);
            return;
        }

        var error = root.GetProperty("platform").TryGetProperty("error", out var e) ? (e.GetString() ?? "Unknown error") : "Unknown error";

        target.MarkFailed(error, DateTime.UtcNow);

        webhookEvent.MarkProcessed(DateTime.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        await _postStatusNotifier.NotifyAsync(
            post.WorkspaceId,
            post.Id,
            post.Status.ToString(),
            post.ZernioTargetCount,
            post.PlatformTargets.Select(t => new PostStatusTargetPayload(t.Id, t.Platform, t.Status.ToString(), t.ExternalPostUrl, t.ErrorMessage, t.ZernioAccountId)).ToList(),
            cancellationToken);
    }

    /// <summary>
    /// Processes a <c>message.received</c> webhook: upserts the <see cref="InboxConversation"/> and
    /// creates a new <see cref="InboxMessage"/>, deduplicating by <c>ZernioMessageId</c>.
    /// </summary>
    private async Task HandleMessageReceivedAsync(
        ZernioWebhookEvent webhookEvent,
        JsonElement root,
        string externalAccountId,
        CancellationToken cancellationToken)
    {
        var workspaceId = webhookEvent.WorkspaceId;
        var utcNow = DateTime.UtcNow;

        // ── a. Extract payload fields ────────────────────────────────────────
        var platform = root.GetProperty("account").TryGetProperty("platform", out var platElem)
            ? platElem.GetString()?.ToLowerInvariant()
            : null;

        if (!root.TryGetProperty("conversation", out var convElem))
        {
            _logger.LogWarning("message.received: payload missing 'conversation' object — skipping.");
            return;
        }

        var zernioConversationId = convElem.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioConversationId))
        {
            _logger.LogWarning("message.received: payload missing conversation.id — skipping.");
            return;
        }

        if (!root.TryGetProperty("message", out var msgElem))
        {
            _logger.LogWarning("message.received: payload missing 'message' object — skipping.");
            return;
        }

        var zernioMessageId = msgElem.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioMessageId))
        {
            _logger.LogWarning("message.received: payload missing message.id — skipping.");
            return;
        }

        var messageText = msgElem.TryGetProperty("text", out var textElem)
            ? textElem.GetString() ?? string.Empty
            : string.Empty;

        var direction = msgElem.TryGetProperty("direction", out var dirElem)
            ? dirElem.GetString()
            : "incoming";

        var sentAt = msgElem.TryGetProperty("sentAt", out var sentAtElem) && sentAtElem.TryGetDateTime(out var parsedSentAt)
            ? parsedSentAt
            : utcNow;

        // Sender info from message.sender
        string? participantName = null;
        string? participantAvatarUrl = null;
        if (msgElem.TryGetProperty("sender", out var senderElem))
        {
            participantName = senderElem.TryGetProperty("name", out var nameElem)
                ? nameElem.GetString()
                : senderElem.TryGetProperty("username", out var usernameElem)
                    ? usernameElem.GetString()
                    : null;
            participantAvatarUrl = senderElem.TryGetProperty("picture", out var picElem)
                ? picElem.GetString()
                : null;
        }

        // ── b. Look up SocialAccount ─────────────────────────────────────────
        var socialAccount = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                a => a.WorkspaceId == workspaceId
                  && a.ExternalAccountId == externalAccountId,
                cancellationToken);

        if (socialAccount == null)
        {
            _logger.LogWarning(
                "message.received: no SocialAccount found for workspace {WorkspaceId}, accountId {AccountId} — skipping.",
                workspaceId,
                externalAccountId);
            return;
        }

        platform ??= socialAccount.Platform;

        // ── c. Check for duplicate message by ZernioMessageId ────────────────
        var existingMessage = await _db.InboxMessages
            .FirstOrDefaultAsync(
                m => m.WorkspaceId == workspaceId
                  && m.ZernioMessageId == zernioMessageId,
                cancellationToken);

        if (existingMessage != null)
        {
            _logger.LogInformation(
                "message.received: duplicate message {ZernioMsgId} detected — skipping.",
                zernioMessageId);

            // Still update the conversation's last message text
            var conv = await _db.InboxConversations
                .FirstOrDefaultAsync(
                    c => c.WorkspaceId == workspaceId
                      && c.ZernioConversationId == zernioConversationId,
                    cancellationToken);

            if (conv != null)
            {
                conv.UpdateLastMessage(messageText, utcNow);
            }

            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        // ── d. Upsert InboxConversation ──────────────────────────────────────
        var conversation = await _db.InboxConversations
            .FirstOrDefaultAsync(
                c => c.WorkspaceId == workspaceId
                  && c.ZernioConversationId == zernioConversationId,
                cancellationToken);

        if (conversation == null)
        {
            conversation = InboxConversation.Create(
                workspaceId,
                zernioConversationId,
                socialAccount.Id,
                platform,
                participantName ?? "Unknown",
                participantAvatarUrl,
                messageText,
                utcNow);

            conversation.IncrementUnread();
            _db.InboxConversations.Add(conversation);

            _logger.LogInformation(
                "message.received: created InboxConversation {ConvId} for workspace {WorkspaceId}.",
                conversation.Id,
                workspaceId);
        }
        else
        {
            conversation.UpdateLastMessage(messageText, utcNow);
            conversation.IncrementUnread();

            // Update participant info if this is an incoming message
            if (string.Equals(direction, "incoming", StringComparison.OrdinalIgnoreCase) && participantName != null)
            {
                conversation.UpdateParticipant(participantName, participantAvatarUrl);
            }

            _logger.LogInformation(
                "message.received: updated existing InboxConversation {ConvId} for workspace {WorkspaceId}.",
                conversation.Id,
                workspaceId);
        }

        // ── e. Create InboxMessage ──────────────────────────────────────────
        var message = InboxMessage.Create(
            workspaceId,
            conversation.Id,
            zernioMessageId,
            direction ?? "incoming",
            messageText,
            sentAt);

        _db.InboxMessages.Add(message);

        await _db.SaveChangesAsync(cancellationToken);

        // ── f. Notify connected clients ─────────────────────────────────────
        await _inboxNotifier.NotifyItemCreatedAsync(
            workspaceId,
            "dm",
            conversation.Id.ToString(),
            messageText,
            platform,
            socialAccount.Id.ToString(),
            1,
            cancellationToken);

        _logger.LogInformation(
            "message.received: processed for workspace {WorkspaceId}, conversation {ConvId}.",
            workspaceId,
            conversation.Id);
    }

    /// <summary>
    /// Processes a <c>comment.received</c> webhook: creates an <see cref="InboxComment"/> row,
    /// deduplicating by <c>ZernioCommentId</c>, and notifies connected clients.
    /// </summary>
    private async Task HandleCommentReceivedAsync(
        ZernioWebhookEvent webhookEvent,
        JsonElement root,
        string externalAccountId,
        CancellationToken cancellationToken)
    {
        var workspaceId = webhookEvent.WorkspaceId;
        var utcNow = DateTime.UtcNow;

        // ── a. Extract payload fields ────────────────────────────────────────
        if (!root.TryGetProperty("comment", out var commentElem))
        {
            _logger.LogWarning("comment.received: payload missing 'comment' object — skipping.");
            return;
        }

        var zernioCommentId = commentElem.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioCommentId))
        {
            _logger.LogWarning("comment.received: payload missing comment.id — skipping.");
            return;
        }

        var platform = commentElem.TryGetProperty("platform", out var platElem)
            ? platElem.GetString()?.ToLowerInvariant()
            : null;

        var zernioPostId = commentElem.TryGetProperty("postId", out var postIdElem)
            ? postIdElem.GetString()
            : null;

        if (string.IsNullOrWhiteSpace(zernioPostId))
        {
            _logger.LogWarning(
                "comment.received: payload missing comment.postId for comment {ZernioCommentId} — skipping.",
                zernioCommentId);
            return;
        }

        var createdAt = commentElem.TryGetProperty("createdAt", out var createdAtElem)
            && createdAtElem.TryGetDateTime(out var parsedCreatedAt)
            ? parsedCreatedAt
            : utcNow;

        // Account-level info
        var accountElem = root.GetProperty("account");
        var zernioAccountId = accountElem.TryGetProperty("id", out var acctIdElem)
            ? acctIdElem.GetString()
            : null;

        // ── b. Look up SocialAccount ─────────────────────────────────────────
        var socialAccount = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                a => a.WorkspaceId == workspaceId
                  && a.ExternalAccountId == externalAccountId,
                cancellationToken);

        if (socialAccount == null)
        {
            _logger.LogWarning(
                "comment.received: no SocialAccount found for workspace {WorkspaceId}, accountId {AccountId} — skipping.",
                workspaceId,
                externalAccountId);
            return;
        }

        platform ??= socialAccount.Platform;

        // Parse ad info if present
        bool? isAd = null;
        string? adId = null;
        string? placement = null;

        if (commentElem.TryGetProperty("ad", out var adElem) && adElem.ValueKind == JsonValueKind.Object)
        {
            isAd = true;
            if (adElem.TryGetProperty("id", out var adIdElem))
            {
                adId = adIdElem.GetString();
            }

            var platLower = (platform ?? socialAccount.Platform)?.ToLowerInvariant();
            if (platLower == "instagram" && adElem.TryGetProperty("title", out var titleElem))
            {
                placement = titleElem.GetString();
            }
            else if (platLower == "facebook" && adElem.TryGetProperty("promotionStatus", out var promoElem))
            {
                placement = promoElem.GetString();
            }
        }

        // ── c. Find existing InboxCommentedPost by ZernioPostId ──────────────
        var existingPost = await _db.InboxCommentedPosts
            .FirstOrDefaultAsync(
                p => p.WorkspaceId == workspaceId
                  && p.ZernioPostId == zernioPostId,
                cancellationToken);

        if (existingPost != null)
        {
            // Bump comment count + record the new top comment id; thread cache is
            // populated by backfill and is invalidated here so it refreshes on next view.
            existingPost.IncrementCommentCount();
            existingPost.SetTopCommentId(zernioCommentId);
            if (!string.IsNullOrEmpty(zernioAccountId) && string.IsNullOrEmpty(existingPost.ZernioAccountId))
            {
                existingPost.SetZernioAccountId(zernioAccountId);
            }

            if (isAd == true)
            {
                existingPost.UpdateCommentedPostFields(
                    existingPost.AccountUsername,
                    existingPost.LikeCount,
                    existingPost.Subreddit,
                    isAd: true,
                    adId: adId ?? existingPost.AdId,
                    placement: placement ?? existingPost.Placement,
                    existingPost.Permalink,
                    existingPost.CommentCount,
                    existingPost.PostPreviewThumbnailUrl,
                    existingPost.PostPreviewCaption);
            }

            // Invalidate comment thread cache
            string? prefix = null;
            if (zernioPostId.Contains('_'))
            {
                prefix = zernioPostId.Split('_')[0];
            }

            var expiredThreads = await _db.InboxCommentThreads
                .Where(t => t.WorkspaceId == workspaceId && (
                    t.ZernioPostId == zernioPostId ||
                    t.ZernioPostId.StartsWith(zernioPostId + "_") ||
                    (prefix != null && (t.ZernioPostId == prefix || t.ZernioPostId.StartsWith(prefix + "_")))
                ))
                .ToListAsync(cancellationToken);

            if (expiredThreads.Count > 0)
            {
                _db.InboxCommentThreads.RemoveRange(expiredThreads);
                _logger.LogInformation("comment.received: invalidated {Count} cached comment thread(s) for post {PostId}.", expiredThreads.Count, zernioPostId);
            }

            if (_listCache != null)
            {
                await _listCache.InvalidateAsync(workspaceId, cancellationToken);
                _logger.LogInformation("comment.received: invalidated comment list cache for workspace {WorkspaceId}.", workspaceId);
            }

            await _db.SaveChangesAsync(cancellationToken);

            await _inboxNotifier.NotifyItemCreatedAsync(
                workspaceId,
                "comment",
                existingPost.Id.ToString(),
                string.Empty,
                platform ?? socialAccount.Platform,
                socialAccount.Id.ToString(),
                1,
                cancellationToken);

            _logger.LogInformation(
                "comment.received: appended to existing post {PostId} in workspace {WorkspaceId}.",
                zernioPostId,
                workspaceId);
            return;
        }

        // ── d. Create new InboxCommentedPost ─────────────────────────────────
        var post = InboxCommentedPost.Create(
            workspaceId,
            zernioPostId,
            socialAccount.Id,
            platform ?? socialAccount.Platform,
            zernioAccountId: zernioAccountId,
            commentCount: 1,
            zernioTopCommentId: zernioCommentId,
            receivedAtUtc: createdAt,
            isAd: isAd,
            adId: adId,
            placement: placement);

        _db.InboxCommentedPosts.Add(post);

        if (_listCache != null)
        {
            await _listCache.InvalidateAsync(workspaceId, cancellationToken);
            _logger.LogInformation("comment.received (new post): invalidated comment list cache for workspace {WorkspaceId}.", workspaceId);
        }

        await _db.SaveChangesAsync(cancellationToken);

        // ── e. Notify connected clients ──────────────────────────────────────
        await _inboxNotifier.NotifyItemCreatedAsync(
            workspaceId,
            "comment",
            post.Id.ToString(),
            string.Empty,
            platform ?? socialAccount.Platform,
            socialAccount.Id.ToString(),
            1,
            cancellationToken);

        _logger.LogInformation(
            "comment.received: created post {PostId} in workspace {WorkspaceId}, entity {EntityId}.",
            zernioPostId,
            workspaceId,
            post.Id);
    }

    /// <summary>
    /// Processes a <c>review.new</c> (or <c>review.updated</c>) webhook: creates or updates an
    /// <see cref="InboxReview"/> row, deduplicating by <c>ZernioReviewId</c>, and notifies
    /// connected clients.
    /// </summary>
    private async Task HandleReviewNewAsync(
        ZernioWebhookEvent webhookEvent,
        JsonElement root,
        string externalAccountId,
        CancellationToken cancellationToken)
    {
        var workspaceId = webhookEvent.WorkspaceId;
        var utcNow = DateTime.UtcNow;

        // ── a. Extract payload fields ────────────────────────────────────────
        if (!root.TryGetProperty("review", out var reviewElem))
        {
            _logger.LogWarning("review.new: payload missing 'review' object — skipping.");
            return;
        }

        var zernioReviewId = reviewElem.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(zernioReviewId))
        {
            _logger.LogWarning("review.new: payload missing review.id — skipping.");
            return;
        }

        var platform = reviewElem.TryGetProperty("platform", out var platElem)
            ? platElem.GetString()?.ToLowerInvariant()
            : null;

        var rating = reviewElem.TryGetProperty("rating", out var ratingElem)
            ? ratingElem.GetInt32()
            : 0;

        var reviewText = reviewElem.TryGetProperty("text", out var textElem)
            ? textElem.GetString()
            : string.Empty;

        var hasReply = reviewElem.TryGetProperty("hasReply", out var hasReplyElem)
            && hasReplyElem.GetBoolean();

        string? replyText = null;
        DateTime? replyCreatedAt = null;
        if (hasReply && reviewElem.TryGetProperty("reply", out var replyElem))
        {
            replyText = replyElem.TryGetProperty("text", out var replyTextElem)
                ? replyTextElem.GetString()
                : null;
            replyCreatedAt = replyElem.TryGetProperty("createdAt", out var replyCreatedAtElem)
                && replyCreatedAtElem.TryGetDateTime(out var parsedReplyAt)
                ? parsedReplyAt
                : null;
        }

        var createdAt = reviewElem.TryGetProperty("createdAt", out var createdAtElem)
            && createdAtElem.TryGetDateTime(out var parsedCreatedAt)
            ? parsedCreatedAt
            : utcNow;

        // Reviewer info
        string? reviewerName = null;
        string? reviewerImage = null;
        if (reviewElem.TryGetProperty("reviewer", out var reviewerElem))
        {
            reviewerName = reviewerElem.TryGetProperty("name", out var nameElem)
                ? nameElem.GetString()
                : null;
            reviewerImage = reviewerElem.TryGetProperty("profileImage", out var imgElem)
                ? imgElem.GetString()
                : null;
        }

        // Account-level info
        var accountElem = root.GetProperty("account");
        var zernioAccountId = accountElem.TryGetProperty("id", out var acctIdElem)
            ? acctIdElem.GetString()
            : null;

        // ── b. Look up SocialAccount ─────────────────────────────────────────
        var socialAccount = await _db.SocialAccounts
            .FirstOrDefaultAsync(
                a => a.WorkspaceId == workspaceId
                  && a.ExternalAccountId == externalAccountId,
                cancellationToken);

        if (socialAccount == null)
        {
            _logger.LogWarning(
                "review.new: no SocialAccount found for workspace {WorkspaceId}, accountId {AccountId} — skipping.",
                workspaceId,
                externalAccountId);
            return;
        }

        platform ??= socialAccount.Platform;

        // ── c. Check for duplicate review by ZernioReviewId ──────────────────
        var existingReview = await _db.InboxReviews
            .FirstOrDefaultAsync(
                r => r.WorkspaceId == workspaceId
                  && r.ZernioReviewId == zernioReviewId,
                cancellationToken);

        if (existingReview != null)
        {
            _logger.LogInformation(
                "review.new: duplicate review {ZernioReviewId} detected — updating reply state if changed.",
                zernioReviewId);

            // Update reply data in case reply was added via platform
            existingReview.UpdateReply(replyText, replyCreatedAt);
            existingReview.UpdateReviewerInfo(reviewerName, reviewerImage);

            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        // ── d. Create InboxReview ────────────────────────────────────────────
        var review = InboxReview.Create(
            workspaceId,
            zernioReviewId,
            socialAccount.Id,
            platform ?? socialAccount.Platform,
            reviewerName ?? "Unknown",
            rating,
            reviewText ?? string.Empty,
            zernioAccountId: zernioAccountId,
            reviewerImageUrl: reviewerImage,
            hasReply: hasReply,
            replyText: replyText,
            replyCreatedAtUtc: replyCreatedAt,
            receivedAtUtc: createdAt);

        _db.InboxReviews.Add(review);

        await _db.SaveChangesAsync(cancellationToken);

        // ── e. Notify connected clients ──────────────────────────────────────
        await _inboxNotifier.NotifyItemCreatedAsync(
            workspaceId,
            "review",
            review.Id.ToString(),
            reviewText ?? string.Empty,
            platform ?? socialAccount.Platform,
            socialAccount.Id.ToString(),
            1,
            cancellationToken);

        _logger.LogInformation(
            "review.new: processed for workspace {WorkspaceId}, review {ReviewId}.",
            workspaceId,
            review.Id);
    }
}

