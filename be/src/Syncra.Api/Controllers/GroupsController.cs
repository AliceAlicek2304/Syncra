using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Groups;
using Syncra.Application.Features.Groups.Commands;
using Syncra.Application.Features.Groups.Queries;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class GroupsController : ControllerBase
{
    private readonly IMediator _mediator;

    public GroupsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup(
        Guid workspaceId,
        [FromBody] CreateGroupDto dto,
        CancellationToken cancellationToken)
    {
        var command = new CreateGroupCommand(
            workspaceId,
            dto.Name);

        var result = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetGroupById),
            new { workspaceId, groupId = result.Id },
            result);
    }

    [HttpGet]
    public async Task<IActionResult> GetGroups(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var query = new GetGroupsQuery(workspaceId);
        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{groupId:guid}")]
    public async Task<IActionResult> GetGroupById(
        Guid workspaceId,
        Guid groupId,
        CancellationToken cancellationToken)
    {
        var query = new GetGroupByIdQuery(workspaceId, groupId);
        var result = await _mediator.Send(query, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{groupId:guid}")]
    public async Task<IActionResult> UpdateGroup(
        Guid workspaceId,
        Guid groupId,
        [FromBody] UpdateGroupDto dto,
        CancellationToken cancellationToken)
    {
        var command = new UpdateGroupCommand(
            workspaceId,
            groupId,
            dto.Name);

        var result = await _mediator.Send(command, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpDelete("{groupId:guid}")]
    public async Task<IActionResult> DeleteGroup(
        Guid workspaceId,
        Guid groupId,
        CancellationToken cancellationToken)
    {
        var command = new DeleteGroupCommand(workspaceId, groupId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }
}
