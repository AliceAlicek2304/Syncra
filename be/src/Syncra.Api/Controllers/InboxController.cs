using Hangfire;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Features.Inbox.Commands;
using Syncra.Application.Features.Inbox.Queries;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Jobs;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/inbox")]
public class InboxController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IBackgroundJobClient _backgroundJobs;
    private readonly IInboxRepository _inboxRepository;

    public InboxController(
        IMediator mediator,
        IBackgroundJobClient backgroundJobs,
        IInboxRepository inboxRepository)
    {
        _mediator = mediator;
        _backgroundJobs = backgroundJobs;
        _inboxRepository = inboxRepository;
    }

    /// <summary>
    /// Lists all inbox DM conversations for the workspace, sorted by most recent first.
    /// </summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var query = new GetInboxConversationsQuery(workspaceId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lists messages in a conversation, newest first, with cursor-based pagination via <c>before</c> timestamp.
    /// </summary>
    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<IActionResult> GetMessages(
        Guid workspaceId,
        Guid conversationId,
        [FromQuery] int limit = 50,
        [FromQuery] DateTime? before = null,
        CancellationToken cancellationToken = default)
    {
        var query = new GetInboxMessagesQuery(workspaceId, conversationId, limit, before);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Sends an outbound DM via the Zernio API and persists it locally.
    /// </summary>
    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<IActionResult> SendMessage(
        Guid workspaceId,
        Guid conversationId,
        [FromBody] InboxSendMessageRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SendInboxMessageCommand(
            workspaceId,
            conversationId,
            request.Text,
            request.AccountId);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Marks a conversation as read (resets unread count to 0).
    /// </summary>
    [HttpPatch("conversations/{conversationId:guid}/read")]
    public async Task<IActionResult> MarkRead(
        Guid workspaceId,
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        var command = new MarkConversationReadCommand(workspaceId, conversationId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }

    /// <summary>
    /// Returns total unread count across all conversations in the workspace.
    /// </summary>
    [HttpGet("unread-summary")]
    public async Task<IActionResult> GetUnreadSummary(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        // Use infrastructure directly via a simple handler pattern
        var query = new GetInboxConversationsQuery(workspaceId);
        var conversations = await _mediator.Send(query, cancellationToken);

        var totalUnread = conversations.Sum(c => c.UnreadCount);
        return Ok(new InboxSummaryDto(totalUnread));
    }

    /// <summary>
    /// Lists inbox comments from local DB, newest first, with timestamp cursor pagination.
    /// </summary>
    [HttpGet("comments")]
    public async Task<IActionResult> GetComments(
        Guid workspaceId,
        [FromQuery] int limit = 50,
        [FromQuery] DateTime? before = null,
        [FromQuery] string? platform = null,
        [FromQuery] string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var query = new GetInboxCommentsQuery(workspaceId, limit, before, platform, accountId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Replies to a comment via the Zernio API. Resolves post/account from the local comment record.
    /// </summary>
    [HttpPost("comments/{commentId:guid}/reply")]
    public async Task<IActionResult> ReplyToComment(
        Guid workspaceId,
        Guid commentId,
        [FromBody] InboxSendCommentReplyRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new ReplyToInboxCommentCommand(
            workspaceId,
            commentId,
            request.Message);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Marks a comment as read.
    /// </summary>
    [HttpPatch("comments/{commentId:guid}/read")]
    public async Task<IActionResult> MarkCommentRead(
        Guid workspaceId,
        Guid commentId,
        CancellationToken cancellationToken = default)
    {
        var command = new MarkCommentReadCommand(workspaceId, commentId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
            return NotFound();

        return NoContent();
    }

    // ── Review routes ───────────────────────────────────────────────────────

    /// <summary>
    /// Lists inbox reviews from local DB, newest first, with timestamp cursor pagination.
    /// Filters to Facebook and Google Business platforms in service layer.
    /// </summary>
    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews(
        Guid workspaceId,
        [FromQuery] int limit = 50,
        [FromQuery] DateTime? before = null,
        [FromQuery] string? platform = null,
        [FromQuery] string? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var query = new GetInboxReviewsQuery(workspaceId, limit, before, platform, accountId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Replies to a review via the Zernio API. Updates local HasReply state on success.
    /// </summary>
    [HttpPost("reviews/{reviewId:guid}/reply")]
    public async Task<IActionResult> ReplyToReview(
        Guid workspaceId,
        Guid reviewId,
        [FromBody] InboxSendReviewReplyRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new ReplyToInboxReviewCommand(
            workspaceId,
            reviewId,
            request.Message);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Marks a review as read.
    /// </summary>
    [HttpPatch("reviews/{reviewId:guid}/read")]
    public async Task<IActionResult> MarkReviewRead(
        Guid workspaceId,
        Guid reviewId,
        CancellationToken cancellationToken = default)
    {
        var command = new MarkReviewReadCommand(workspaceId, reviewId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
            return NotFound();

        return NoContent();
    }

    // ── Sync / Backfill routes ─────────────────────────────────────────────

    /// <summary>
    /// Triggers a 30-day inbox backfill for this workspace (D-09, D-10).
    /// Enqueues a Hangfire job and returns 202 Accepted if queued.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> TriggerSync(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        _backgroundJobs.Enqueue<InboxBackfillJob>(
            job => job.ExecuteAsync(workspaceId, cancellationToken));

        return Accepted(new { message = "Inbox sync queued.", workspaceId });
    }

    /// <summary>
    /// Returns the current inbox sync status for the workspace (D-11).
    /// </summary>
    [HttpGet("sync-status")]
    public async Task<IActionResult> GetSyncStatus(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        // Determine if any inbox data exists for this workspace
        var conversationCount = (await _inboxRepository.GetConversationsAsync(workspaceId, cancellationToken)).Count;
        var hasData = conversationCount > 0;

        return Ok(new InboxSyncStatusDto(
            IsSyncing: false,
            LastSyncedAtUtc: hasData ? DateTime.UtcNow : (DateTime?)null));
    }
}
