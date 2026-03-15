using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Ideas;
using Syncra.Application.Features.Ideas.Commands;
using Syncra.Application.Features.Ideas.Queries;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class IdeasController : ControllerBase
{
    private readonly IMediator _mediator;

    public IdeasController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateIdea(
        Guid workspaceId,
        [FromBody] CreateIdeaDto dto,
        CancellationToken cancellationToken)
    {
        var command = new CreateIdeaCommand(
            workspaceId,
            dto.Title,
            dto.Description,
            dto.Status);

        var result = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetIdeaById),
            new { workspaceId, ideaId = result.Id },
            result);
    }

    [HttpGet]
    public async Task<IActionResult> GetIdeas(
        Guid workspaceId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetIdeasQuery(
            workspaceId,
            status,
            page,
            pageSize);

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{ideaId:guid}")]
    public async Task<IActionResult> GetIdeaById(
        Guid workspaceId,
        Guid ideaId,
        CancellationToken cancellationToken)
    {
        var query = new GetIdeaByIdQuery(workspaceId, ideaId);
        var result = await _mediator.Send(query, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{ideaId:guid}")]
    public async Task<IActionResult> UpdateIdea(
        Guid workspaceId,
        Guid ideaId,
        [FromBody] UpdateIdeaDto dto,
        CancellationToken cancellationToken)
    {
        var command = new UpdateIdeaCommand(
            workspaceId,
            ideaId,
            dto.Title,
            dto.Description,
            dto.Status);

        var result = await _mediator.Send(command, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpDelete("{ideaId:guid}")]
    public async Task<IActionResult> DeleteIdea(
        Guid workspaceId,
        Guid ideaId,
        CancellationToken cancellationToken)
    {
        var command = new DeleteIdeaCommand(workspaceId, ideaId);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }
}