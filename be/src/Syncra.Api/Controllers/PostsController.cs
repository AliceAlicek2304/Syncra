using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;

    public PostsController(IPostService postService)
    {
        _postService = postService;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost(
        Guid workspaceId,
        [FromBody] CreatePostDto dto,
        CancellationToken cancellationToken)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { error = "Invalid workspace ID." });
        }

        if (dto == null)
        {
            return BadRequest(new { error = "Post data is required." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = ResolveUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var created = await _postService.CreatePostAsync(
            workspaceId,
            userId.Value,
            dto,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetPostById),
            new { workspaceId, postId = created.Id },
            created);
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
        var posts = await _postService.GetPostsAsync(
            workspaceId,
            status,
            scheduledFromUtc,
            scheduledToUtc,
            page,
            pageSize,
            cancellationToken);

        return Ok(posts);
    }

    [HttpGet("{postId:guid}")]
    public async Task<IActionResult> GetPostById(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken)
    {
        var post = await _postService.GetPostByIdAsync(workspaceId, postId, cancellationToken);
        if (post is null)
        {
            return NotFound();
        }

        return Ok(post);
    }

    [HttpPut("{postId:guid}")]
    public async Task<IActionResult> UpdatePost(
        Guid workspaceId,
        Guid postId,
        [FromBody] UpdatePostDto dto,
        CancellationToken cancellationToken)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { error = "Invalid workspace ID." });
        }

        if (postId == Guid.Empty)
        {
            return BadRequest(new { error = "Invalid post ID." });
        }

        if (dto == null)
        {
            return BadRequest(new { error = "Update data is required." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = ResolveUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var updated = await _postService.UpdatePostAsync(
            workspaceId,
            postId,
            userId.Value,
            dto,
            cancellationToken);

        if (updated is null)
        {
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{postId:guid}")]
    public async Task<IActionResult> DeletePost(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken)
    {
        var deleted = await _postService.DeletePostAsync(workspaceId, postId, cancellationToken);
        if (!deleted)
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
            if (workspaceId == Guid.Empty)
            {
                return BadRequest(new { error = "Invalid workspace ID." });
            }

            if (postId == Guid.Empty)
            {
                return BadRequest(new { error = "Invalid post ID." });
            }

            var userId = ResolveUserId();
            if (userId is null)
            {
                return Unauthorized();
            }

            try
            {
                var result = await _postService.PublishPostAsync(
                    workspaceId,
                    postId,
                    userId.Value,
                    dto?.DryRun ?? false,
                    cancellationToken);

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

    private Guid? ResolveUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim is null)
        {
            return null;
        }

        return Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}

