using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Features.Posts.CreateZernioPost;
using Syncra.Application.Features.Posts.RetryZernioPost;
using Syncra.Application.Features.Posts.DeleteZernioPost;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/posts/zernio")]
public sealed class ZernioPostsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ZernioPostsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateZernioPost(
        Guid workspaceId,
        [FromBody] CreateZernioPostDto dto,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var command = new CreateZernioPostCommand(
            workspaceId,
            userId.Value,
            dto.Title,
            dto.Content,
            dto.SocialAccountIds,
            dto.ScheduledAtUtc,
            dto.PublishNow);

        var result = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(PostsController.GetPostById),
            "Posts",
            new { workspaceId, postId = result.Id },
            result);
    }

    [HttpPost("{postId:guid}/retry")]
    public async Task<IActionResult> RetryZernioPost(Guid workspaceId, Guid postId, CancellationToken ct)
    {
        var result = await _mediator.Send(new RetryZernioPostCommand(workspaceId, postId), ct);
        if (result == null)
            return NotFound();
            
        return Ok(result);
    }

    [HttpDelete("{postId:guid}")]
    public async Task<IActionResult> DeleteZernioPost(Guid workspaceId, Guid postId, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteZernioPostCommand(workspaceId, postId), ct);
        if (!result)
            return NotFound();
            
        return NoContent();
    }
}
