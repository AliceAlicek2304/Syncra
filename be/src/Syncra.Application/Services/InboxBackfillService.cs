using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Services;

/// <summary>
/// Orchestrates the 30-day historical inbox backfill from Zernio list APIs (D-09, D-10).
/// Paginates conversations, comments, and reviews, upserting into local tables.
///
/// Design notes:
///   - DM threads are NOT bulk-fetched — messages load lazily on thread open (RESEARCH Pattern 5).
///   - Backfill uses the workspace ZernioProfile's profileId for API calls.
///   - Each API call wraps 402/403 billing errors via ZernioBillingRequiredException.
/// </summary>
public sealed class InboxBackfillService : IInboxBackfillService
{
    private static readonly TimeSpan BackfillWindow = TimeSpan.FromDays(30);

    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IInboxRepository _inboxRepository;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly ILogger<InboxBackfillService> _logger;

    public InboxBackfillService(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        IInboxRepository inboxRepository,
        ISocialAccountRepository socialAccountRepository,
        ILogger<InboxBackfillService> logger)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _inboxRepository = inboxRepository;
        _socialAccountRepository = socialAccountRepository;
        _logger = logger;
    }

    public async Task<Result> BackfillAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;
        _logger.LogInformation(
            "Starting inbox backfill for workspace {WorkspaceId} at {UtcNow}.",
            workspaceId,
            utcNow);

        // ── 1. Resolve ZernioProfile ──────────────────────────────────────────
        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId);
        if (profile is null || !profile.IsActive)
        {
            _logger.LogWarning(
                "No active ZernioProfile found for workspace {WorkspaceId} — cannot backfill.",
                workspaceId);
            return Result.Failure("Zernio profile not found or inactive.");
        }

        // ── 2. Backfill DMs (conversation headers only) ───────────────────────
        await BackfillConversationsAsync(profile.ZernioProfileId, workspaceId, utcNow, cancellationToken);

        // ── 3. Backfill Comments ──────────────────────────────────────────────
        await BackfillCommentsAsync(profile.ZernioProfileId, workspaceId, utcNow, cancellationToken);

        // ── 4. Backfill Reviews ───────────────────────────────────────────────
        await BackfillReviewsAsync(profile.ZernioProfileId, workspaceId, utcNow, cancellationToken);

        _logger.LogInformation(
            "Inbox backfill completed for workspace {WorkspaceId}.",
            workspaceId);

        return Result.Success();
    }

    // ── Private backfill methods ──────────────────────────────────────────────

    /// <summary>
    /// Paginates Zernio conversation list API, upserting conversation headers only.
    /// Stops when items fall outside the 30-day window or <c>hasMore</c> is false.
    /// Lazy message load on thread open (per RESEARCH).
    /// </summary>
    private async Task BackfillConversationsAsync(
        string profileId,
        Guid workspaceId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var sinceThreshold = utcNow - BackfillWindow;
        string? cursor = null;
        var totalUpserted = 0;

        do
        {
            ZernioInboxConversationsPageDto page;
            try
            {
                page = await _zernioClient.ListInboxConversationsAsync(
                    profileId, cursor, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(
                    ex,
                    "Error fetching inbox conversations page for workspace {WorkspaceId}, cursor {Cursor}.",
                    workspaceId,
                    cursor);
                break;
            }

            if (page.Items.Count == 0)
                break;

            foreach (var item in page.Items)
            {
                if (item.LastMessageAt < sinceThreshold)
                {
                    _logger.LogInformation(
                        "Reached 30-day threshold on conversation {ConvId} with LastMessageAt {LastMessageAt} — stopping conversation backfill.",
                        item.Id,
                        item.LastMessageAt);
                    return;
                }

                await UpsertConversationAsync(workspaceId, item, cancellationToken);
                totalUpserted++;
            }

            cursor = page.NextCursor;
        }
        while (!string.IsNullOrEmpty(cursor) && !cancellationToken.IsCancellationRequested);

        _logger.LogInformation(
            "Backfilled {Count} conversations for workspace {WorkspaceId}.",
            totalUpserted,
            workspaceId);
    }

    private async Task UpsertConversationAsync(
        Guid workspaceId,
        ZernioInboxConversationItemDto item,
        CancellationToken cancellationToken)
    {
        var existing = await _inboxRepository.GetConversationByZernioIdAsync(
            workspaceId, item.Id, cancellationToken);

        if (existing != null)
        {
            existing.UpdateLastMessage(item.LastMessageText, item.LastMessageAt);
            existing.UpdateParticipant(item.ParticipantName, item.ParticipantPicture);
            return;
        }

        var socialAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspaceId);
        var matchingAccount = socialAccounts
            .FirstOrDefault(sa => sa.Platform.Equals(item.Platform, StringComparison.OrdinalIgnoreCase)
                               && sa.IsActive);

        var conversation = InboxConversation.Create(
            workspaceId,
            item.Id,
            matchingAccount?.Id,
            item.Platform,
            item.ParticipantName ?? item.ParticipantUsername,
            item.ParticipantPicture,
            item.LastMessageText,
            item.LastMessageAt);

        await _inboxRepository.AddConversationAsync(conversation);
    }

    /// <summary>
    /// Paginates Zernio comments list API with a 30-day <c>since</c> filter.
    /// Backfills commented-post entries; per-post comment threads loaded on UI demand.
    /// </summary>
    private async Task BackfillCommentsAsync(
        string profileId,
        Guid workspaceId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var sinceThreshold = utcNow - BackfillWindow;
        string? cursor = null;
        var totalUpserted = 0;

        do
        {
            ZernioInboxCommentsPageDto page;
            try
            {
                page = await _zernioClient.ListInboxCommentsAsync(
                    profileId, sinceThreshold, cursor, cancellationToken: cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(
                    ex,
                    "Error fetching inbox comments page for workspace {WorkspaceId}, cursor {Cursor}.",
                    workspaceId,
                    cursor);
                break;
            }

            if (page.Items.Count == 0)
                break;

            foreach (var item in page.Items)
            {
                if (item.CreatedTime < sinceThreshold)
                {
                    _logger.LogInformation(
                        "Reached 30-day threshold on comment (post {PostId}) with CreatedTime {Created} — stopping comment backfill.",
                        item.Id,
                        item.CreatedTime);
                    return;
                }

                await UpsertCommentAsync(workspaceId, item, cancellationToken);
                totalUpserted++;
            }

            cursor = page.NextCursor;
        }
        while (!string.IsNullOrEmpty(cursor) && !cancellationToken.IsCancellationRequested);

        _logger.LogInformation(
            "Backfilled {Count} comments for workspace {WorkspaceId}.",
            totalUpserted,
            workspaceId);
    }

    private async Task UpsertCommentAsync(
        Guid workspaceId,
        ZernioInboxCommentItemDto item,
        CancellationToken cancellationToken)
    {
        // Skip if this item already exists (by commented-post ID)
        var existing = await _inboxRepository.GetCommentByZernioIdAsync(
            workspaceId, item.Id, cancellationToken);

        if (existing != null)
            return;

        var socialAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspaceId);
        var matchingAccount = socialAccounts
            .FirstOrDefault(sa => sa.Platform.Equals(item.Platform, StringComparison.OrdinalIgnoreCase)
                               && sa.IsActive);

        var previewCaption = item.Content?[..Math.Min(item.Content.Length, 80)];

        var comment = InboxComment.Create(
            workspaceId,
            item.Id,
            matchingAccount?.Id,
            item.Platform,
            item.Content,
            item.Content,
            zernioPostId: item.Id,
            zernioAccountId: matchingAccount?.ExternalAccountId,
            postPreviewCaption: previewCaption,
            postPreviewThumbnailUrl: item.Picture,
            commentCount: item.CommentCount,
            zernioTopCommentId: item.Cid,
            receivedAtUtc: item.CreatedTime);

        await _inboxRepository.AddCommentAsync(comment);
    }

    /// <summary>
    /// Paginates Zernio reviews list API, stopping when items fall outside the 30-day window.
    /// </summary>
    private async Task BackfillReviewsAsync(
        string profileId,
        Guid workspaceId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var sinceThreshold = utcNow - BackfillWindow;
        string? cursor = null;
        var totalUpserted = 0;

        do
        {
            ZernioInboxReviewsPageDto page;
            try
            {
                page = await _zernioClient.ListInboxReviewsAsync(
                    profileId, cursor, cancellationToken: cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(
                    ex,
                    "Error fetching inbox reviews page for workspace {WorkspaceId}, cursor {Cursor}.",
                    workspaceId,
                    cursor);
                break;
            }

            if (page.Items.Count == 0)
                break;

            foreach (var item in page.Items)
            {
                if (item.Created < sinceThreshold)
                {
                    _logger.LogInformation(
                        "Reached 30-day threshold on review {ReviewId} with Created {Created} — stopping review backfill.",
                        item.Id,
                        item.Created);
                    return;
                }

                await UpsertReviewAsync(workspaceId, item, cancellationToken);
                totalUpserted++;
            }

            cursor = page.NextCursor;
        }
        while (!string.IsNullOrEmpty(cursor) && !cancellationToken.IsCancellationRequested);

        _logger.LogInformation(
            "Backfilled {Count} reviews for workspace {WorkspaceId}.",
            totalUpserted,
            workspaceId);
    }

    private async Task UpsertReviewAsync(
        Guid workspaceId,
        ZernioInboxReviewItemDto item,
        CancellationToken cancellationToken)
    {
        var existing = await _inboxRepository.GetReviewByZernioIdAsync(
            workspaceId, item.Id, cancellationToken);

        if (existing != null)
        {
            if (item.HasReply)
                existing.UpdateReply(item.ReplyText, item.ReplyCreated);
            existing.UpdateReviewerInfo(item.ReviewerName, item.ReviewerImageUrl);
            return;
        }

        var socialAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspaceId);
        var matchingAccount = socialAccounts
            .FirstOrDefault(sa => sa.Platform.Equals(item.Platform, StringComparison.OrdinalIgnoreCase)
                               && sa.IsActive);

        var review = InboxReview.Create(
            workspaceId,
            item.Id,
            matchingAccount?.Id,
            item.Platform,
            item.ReviewerName ?? "Unknown",
            item.Rating,
            item.Text,
            zernioAccountId: item.AccountId,
            reviewerImageUrl: item.ReviewerImageUrl,
            hasReply: item.HasReply,
            replyText: item.ReplyText,
            replyCreatedAtUtc: item.ReplyCreated,
            receivedAtUtc: item.Created);

        await _inboxRepository.AddReviewAsync(review);
    }
}
