using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Features.Analytics.Queries;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AnalyticsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{integrationId:guid}")]
    public async Task<IActionResult> GetIntegrationAnalytics(
        Guid workspaceId,
        Guid integrationId,
        [FromQuery] int date = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetIntegrationAnalyticsQuery(workspaceId, integrationId, date),
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("post/{postId:guid}")]
    public async Task<IActionResult> GetPostAnalytics(
        Guid workspaceId,
        Guid postId,
        [FromQuery] int date = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetPostAnalyticsQuery(workspaceId, postId, date),
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("post/{postId:guid}/debug")]
    public async Task<IActionResult> DebugPost(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetPostDebugQuery(workspaceId, postId),
            cancellationToken);

        if (result is null)
            return NotFound(new { error = "Post not found" });

        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetWorkspaceSummary(
        Guid workspaceId,
        [FromQuery] int date = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceSummaryQuery(workspaceId, date),
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("heatmap")]
    public async Task<IActionResult> GetWorkspaceHeatmap(
        Guid workspaceId,
        [FromQuery] int date = 90,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceHeatmapQuery(workspaceId, date),
            cancellationToken);
        return Ok(result);
    }
}
