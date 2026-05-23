using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Features.Inbox.Commands;
using Syncra.Application.Features.Inbox.Queries;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/inbox")]
public class InboxController : ControllerBase
{
    private readonly IMediator _mediator;

    public InboxController(IMediator mediator)
    {
        _mediator = mediator;
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
}
