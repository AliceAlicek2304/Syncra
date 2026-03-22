using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Features.Posts.Commands;
using Syncra.Application.Features.Posts.Queries;
using Syncra.Shared.Extensions;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class PostsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PostsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost(
        Guid workspaceId,
        [FromBody] CreatePostDto dto,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var command = new CreatePostCommand(
            workspaceId,
            userId.Value,
            dto.Title,
            dto.Content,
            dto.ScheduledAtUtc,
            dto.IntegrationId,
            dto.MediaIds);

        var result = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetPostById),
            new { workspaceId, postId = result.Id },
            result);
    }

    [HttpGet]
    public async Task<IActionResult> GetPosts(
        Guid workspaceId,
        [FromQuery] string? status,
        [FromQuery] DateTime? scheduledFromUtc,
        [FromQuery] DateTime? scheduledToUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetPostsQuery(
            workspaceId,
            status,
            scheduledFromUtc,
            scheduledToUtc,
            page,
            pageSize);

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{postId:guid}")]
    public async Task<IActionResult> GetPostById(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken)
    {
        var query = new GetPostByIdQuery(workspaceId, postId);
        var result = await _mediator.Send(query, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{postId:guid}")]
    public async Task<IActionResult> UpdatePost(
        Guid workspaceId,
        Guid postId,
        [FromBody] UpdatePostDto dto,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var command = new UpdatePostCommand(
            workspaceId,
            postId,
            userId.Value,
            dto.Title,
            dto.Content,
            dto.ScheduledAtUtc,
            dto.Status,
            dto.IntegrationId,
            dto.MediaIds);

        var result = await _mediator.Send(command, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpDelete("{postId:guid}")]
    public async Task<IActionResult> DeletePost(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken)
    {
        var command = new DeletePostCommand(workspaceId, postId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPost("{postId:guid}/publish")]
    public async Task<IActionResult> PublishPost(
        Guid workspaceId,
        Guid postId,
        [FromBody] PublishPostRequestDto? dto,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var command = new PublishPostCommand(
            workspaceId,
            postId,
            userId.Value,
            dto?.DryRun ?? false,
            dto?.ScheduledAtUtc,
            dto?.IntegrationId);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }
}
