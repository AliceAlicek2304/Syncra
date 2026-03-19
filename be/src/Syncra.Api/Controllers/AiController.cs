using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Syncra.Application.DTOs.AI;
using Syncra.Application.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/ai")]
public sealed class AiController : ControllerBase
{
    private readonly IAiIdeaGenerationService _ideaGenerationService;
    private readonly AppDbContext _db;

    public AiController(
        IAiIdeaGenerationService ideaGenerationService,
        AppDbContext db)
    {
        _ideaGenerationService = ideaGenerationService;
        _db = db;
    }

    [HttpPost("ideas/generate")]
    public async Task<IActionResult> GenerateIdeas(
        Guid workspaceId,
        [FromBody] GenerateIdeasRequestDto dto,
        CancellationToken cancellationToken)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { message = "Invalid workspace ID." });
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

        var canAccessWorkspace = await _db.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId.Value, cancellationToken);

        if (!canAccessWorkspace)
        {
            return Forbid();
        }

        try
        {
            var result = await _ideaGenerationService.GenerateIdeasAsync(workspaceId, userId.Value, dto, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { message = $"AI provider error: {ex.Message}" });
        }
    }

    [HttpPost("repurpose/generate")]
    public async Task<IActionResult> GenerateRepurpose(
        Guid workspaceId,
        [FromBody] GenerateRepurposeRequestDto dto,
        CancellationToken cancellationToken)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { message = "Invalid workspace ID." });
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

        var canAccessWorkspace = await _db.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId.Value, cancellationToken);

        if (!canAccessWorkspace)
        {
            return Forbid();
        }

        try
        {
            var result = await _ideaGenerationService.GenerateRepurposeAsync(workspaceId, userId.Value, dto, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { message = $"AI provider error: {ex.Message}" });
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
