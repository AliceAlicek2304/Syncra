using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Api.Middleware;
using Syncra.Application.DTOs;
using Syncra.Application.Features.Profiles.Commands;
using Syncra.Application.Features.Profiles.Queries;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/profiles")]
public class ProfilesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProfilesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfiles(CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId == null)
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });

        var result = await _mediator.Send(new GetProfilesQuery(workspaceId.Value), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest request, CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId == null)
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });

        var command = new CreateProfileCommand(workspaceId.Value, request.Name, request.Color);
        var result = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetProfiles), new { }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId == null)
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });

        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var command = new UpdateProfileCommand(id, workspaceId.Value, userId.Value, request.Name);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProfile(Guid id, CancellationToken cancellationToken)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId == null)
            return BadRequest(new { code = "missing_workspace", message = "X-Workspace-Id header is required." });

        var command = new DeleteProfileCommand(id, workspaceId.Value);
        await _mediator.Send(command, cancellationToken);
        return NoContent();
    }
}

public record CreateProfileRequest(string Name, string? Color = null);
public record UpdateProfileRequest(string Name);
