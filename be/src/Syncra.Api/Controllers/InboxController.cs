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
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
        var query = new GetInboxConversationsQuery(workspaceId, explicitProfileId);
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
            request);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Gets conversation details from local DB and Zernio API.
    /// </summary>
    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<IActionResult> GetConversation(
        Guid workspaceId,
        Guid conversationId,
        [FromQuery] string accountId,
        CancellationToken cancellationToken)
    {
        var query = new GetInboxConversationQuery(workspaceId, conversationId, accountId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Creates a new conversation and sends an optional initial message.
    /// </summary>
    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation(
        Guid workspaceId,
        [FromBody] CreateInboxConversationRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateInboxConversationCommand(workspaceId, request);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Updates the conversation status (active/archived).
    /// </summary>
    [HttpPut("conversations/{conversationId:guid}")]
    public async Task<IActionResult> UpdateConversation(
        Guid workspaceId,
        Guid conversationId,
        [FromBody] UpdateInboxConversationRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateInboxConversationCommand(workspaceId, conversationId, request);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Edits a previously sent message. Only supported on select platforms.
    /// </summary>
    [HttpPatch("conversations/{conversationId:guid}/messages/{messageId}")]
    public async Task<IActionResult> EditMessage(
        Guid workspaceId,
        Guid conversationId,
        string messageId,
        [FromBody] EditInboxMessageRequest request,
        CancellationToken cancellationToken)
    {
        var command = new EditInboxMessageCommand(workspaceId, conversationId, messageId, request);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Deletes a message from a conversation.
    /// </summary>
    [HttpDelete("conversations/{conversationId:guid}/messages/{messageId}")]
    public async Task<IActionResult> DeleteMessage(
        Guid workspaceId,
        Guid conversationId,
        string messageId,
        [FromQuery] string accountId,
        CancellationToken cancellationToken)
    {
        var command = new DeleteInboxMessageCommand(workspaceId, conversationId, messageId, accountId);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result) return BadRequest(new { error = "Failed to delete message." });
        return Ok(new { success = true });
    }

    /// <summary>
    /// Adds an emoji reaction to a message.
    /// </summary>
    [HttpPost("conversations/{conversationId:guid}/messages/{messageId}/reactions")]
    public async Task<IActionResult> AddReaction(
        Guid workspaceId,
        Guid conversationId,
        string messageId,
        [FromBody] AddMessageReactionRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AddMessageReactionCommand(workspaceId, conversationId, messageId, request);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result) return BadRequest(new { error = "Failed to add reaction." });
        return Ok(new { success = true });
    }

    /// <summary>
    /// Removes an emoji reaction from a message.
    /// </summary>
    [HttpDelete("conversations/{conversationId:guid}/messages/{messageId}/reactions")]
    public async Task<IActionResult> RemoveReaction(
        Guid workspaceId,
        Guid conversationId,
        string messageId,
        [FromQuery] string accountId,
        CancellationToken cancellationToken)
    {
        var command = new RemoveMessageReactionCommand(workspaceId, conversationId, messageId, accountId);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result) return BadRequest(new { error = "Failed to remove reaction." });
        return Ok(new { success = true });
    }

    /// <summary>
    /// Sends a typing indicator to a conversation.
    /// </summary>
    [HttpPost("conversations/{conversationId:guid}/typing")]
    public async Task<IActionResult> SendTypingIndicator(
        Guid workspaceId,
        Guid conversationId,
        [FromBody] SendTypingIndicatorRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SendTypingIndicatorCommand(workspaceId, conversationId, request);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result) return BadRequest(new { error = "Failed to send typing indicator." });
        return Ok(new { success = true });
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
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
        var query = new GetInboxConversationsQuery(workspaceId, explicitProfileId);
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
        [FromQuery] string? cursor = null,
        [FromQuery] string? platform = null,
        [FromQuery] string? accountId = null,
        [FromQuery] string? profileId = null,
        [FromQuery] int? minComments = null,
        [FromQuery] DateTime? since = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null,
        CancellationToken cancellationToken = default)
    {
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
        var resolvedProfileId = profileId ?? explicitProfileId?.ToString();

        var query = new GetInboxCommentsQuery(
            workspaceId,
            limit,
            cursor,
            platform,
            accountId,
            resolvedProfileId,
            minComments,
            since,
            sortBy,
            sortOrder);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Replies to a comment via the Zernio API. Resolves post/account from the local comment record.
    /// </summary>
    [HttpPost("comments/{commentId}/reply")]
    public async Task<IActionResult> ReplyToComment(
        Guid workspaceId,
        string commentId,
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
    [HttpPatch("comments/{commentId}/read")]
    public async Task<IActionResult> MarkCommentRead(
        Guid workspaceId,
        string commentId,
        CancellationToken cancellationToken = default)
    {
        var command = new MarkCommentReadCommand(workspaceId, commentId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
            return NotFound();

        return NoContent();
    }

    // ── Additional Comment API routes ───────────────────────────────────────

    /// <summary>
    /// Gets comments for a specific post from Zernio API.
    /// </summary>
    [HttpGet("posts/{postId}/comments")]
    public async Task<IActionResult> GetPostComments(
        Guid workspaceId,
        string postId,
        [FromQuery] string? accountId = null,
        [FromQuery] string? subreddit = null,
        [FromQuery] int? limit = null,
        [FromQuery] string? cursor = null,
        [FromQuery] string? commentId = null,
        [FromQuery] bool forceRefresh = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            // Return empty list if accountId is missing, because Zernio API requires it
            return Ok(new ZernioPostCommentsResponseDto(
                Status: "ok",
                Post: null,
                Meta: new ZernioCommentsMetaDto(string.Empty, null, null, null, DateTime.UtcNow, null),
                Comments: new List<ZernioPostCommentItemDto>(),
                Pagination: new ZernioCommentsPaginationDto(false, null)));
        }

        var query = new GetInboxPostCommentsQuery(
            workspaceId,
            postId,
            accountId,
            subreddit,
            limit,
            cursor,
            commentId,
            SelfAccountId: accountId,
            Platform: null,
            ForceRefresh: forceRefresh);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Deletes a comment.
    /// </summary>
    [HttpDelete("comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(
        Guid workspaceId,
        string commentId,
        CancellationToken cancellationToken = default)
    {
        var command = new DeleteInboxCommentCommand(workspaceId, commentId);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result.Success) return BadRequest(new { error = result.Message ?? "Failed to delete comment." });
        return Ok(result);
    }

    /// <summary>
    /// Hides a comment.
    /// </summary>
    [HttpPost("comments/{commentId}/hide")]
    public async Task<IActionResult> HideComment(
        Guid workspaceId,
        string commentId,
        CancellationToken cancellationToken = default)
    {
        var command = new HideInboxCommentCommand(workspaceId, commentId);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.Status == null) return BadRequest(new { error = "Failed to hide comment." });
        return Ok(result);
    }

    /// <summary>
    /// Unhides a comment.
    /// </summary>
    [HttpDelete("comments/{commentId}/hide")]
    public async Task<IActionResult> UnhideComment(
        Guid workspaceId,
        string commentId,
        CancellationToken cancellationToken = default)
    {
        var command = new UnhideInboxCommentCommand(workspaceId, commentId);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.Status == null) return BadRequest(new { error = "Failed to unhide comment." });
        return Ok(result);
    }

    /// <summary>
    /// Likes a comment.
    /// </summary>
    [HttpPost("comments/{commentId}/like")]
    public async Task<IActionResult> LikeComment(
        Guid workspaceId,
        string commentId,
        [FromBody] LikeInboxCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new LikeInboxCommentCommand(workspaceId, commentId, request.Cid);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result.Liked) return BadRequest(new { error = result.Status ?? "Failed to like comment." });
        return Ok(result);
    }

    /// <summary>
    /// Unlikes a comment.
    /// </summary>
    [HttpDelete("comments/{commentId}/like")]
    public async Task<IActionResult> UnlikeComment(
        Guid workspaceId,
        string commentId,
        [FromQuery] string? likeUri = null,
        CancellationToken cancellationToken = default)
    {
        var command = new UnlikeInboxCommentCommand(workspaceId, commentId, likeUri);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.Liked) return BadRequest(new { error = result.Status ?? "Failed to unlike comment." });
        return Ok(result);
    }

    /// <summary>
    /// Sends a private reply to a comment.
    /// </summary>
    [HttpPost("comments/{commentId}/private-reply")]
    public async Task<IActionResult> SendPrivateReplyToComment(
        Guid workspaceId,
        string commentId,
        [FromBody] SendPrivateReplyRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new SendPrivateReplyToCommentCommand(
            workspaceId,
            commentId,
            request.Message,
            request.QuickReplies,
            request.Buttons);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.Status == null && result.CommentId == null) return BadRequest(new { error = "Failed to send private reply." });
        return Ok(result);
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
    public IActionResult TriggerSync(
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
