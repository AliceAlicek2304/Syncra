using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Api.Filters;
using Syncra.Application.DTOs;
using Syncra.Application.Features.Workspaces.Commands;
using Syncra.Application.Features.Workspaces.Queries;
using Syncra.Shared.Extensions;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class WorkspacesController : ControllerBase
{
    private readonly IMediator _mediator;

    public WorkspacesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// POST /api/v1/workspaces
    /// Creates a new workspace and assigns the creator as its Owner.
    /// </summary>
    [HttpPost]
    [ServiceFilter(typeof(IdempotencyFilter))]
    public async Task<IActionResult> CreateWorkspace([FromBody] CreateWorkspaceDto dto, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var command = new CreateWorkspaceCommand(userId.Value, dto.Name);
        var result = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetWorkspaces), new { }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetWorkspaces(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var query = new GetWorkspacesQuery(userId.Value);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }
}
