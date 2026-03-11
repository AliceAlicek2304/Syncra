using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class WorkspacesController : ControllerBase
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public WorkspacesController(
        IWorkspaceRepository workspaceRepository,
        IUnitOfWork unitOfWork)
    {
        _workspaceRepository = workspaceRepository;
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// POST /api/v1/workspaces
    /// Creates a new workspace and assigns the creator as its Owner.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateWorkspace([FromBody] CreateWorkspaceDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = ResolveUserId();
        if (userId == null) return Unauthorized();

        var slug = GenerateSlug(dto.Name);

        // Ensure slug uniqueness
        var existing = await _workspaceRepository.GetBySlugAsync(slug);
        if (existing != null)
        {
            // Append a short unique suffix to avoid collision
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";
        }

        var workspace = new Workspace
        {
            Name = dto.Name,
            Slug = slug,
            OwnerUserId = userId.Value
        };

        var ownerMember = new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = userId.Value,
            Role = WorkspaceMemberRole.Owner,
            Status = WorkspaceMemberStatus.Active,
            JoinedAtUtc = DateTime.UtcNow
        };

        workspace.Members.Add(ownerMember);

        await _workspaceRepository.AddAsync(workspace);
        await _unitOfWork.SaveChangesAsync();

        var result = MapToDto(workspace);
        return CreatedAtAction(nameof(GetWorkspaces), new { }, result);
    }

    /// <summary>
    /// GET /api/v1/workspaces
    /// Returns all workspaces the authenticated user is a member of.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetWorkspaces()
    {
        var userId = ResolveUserId();
        if (userId == null) return Unauthorized();

        var workspaces = await _workspaceRepository.GetByUserIdAsync(userId.Value);
        var result = workspaces.Select(MapToDto);
        return Ok(result);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private Guid? ResolveUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null) return null;
        return Guid.TryParse(claim.Value, out var id) ? id : null;
    }

    private static WorkspaceDto MapToDto(Workspace w) =>
        new(w.Id, w.Name, w.Slug, w.OwnerUserId, w.CreatedAtUtc);

    private static string GenerateSlug(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = Regex.Replace(slug, @"-{2,}", "-").Trim('-');
        return slug.Length > 0 ? slug : "workspace";
    }
}
