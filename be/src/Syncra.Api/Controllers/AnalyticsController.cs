using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] DateTime fromUtc, [FromQuery] DateTime toUtc)
    {
        // Hardcoded workspaceId for now, will be replaced with user's workspace from context
        var workspaceId = Guid.Parse("d4d1c5b5-1b1b-4b1b-8b1b-1b1b1b1b1b1b");
        var overview = await _analyticsService.GetOverviewAsync(workspaceId, fromUtc, toUtc);
        return Ok(overview);
    }

    [HttpGet("platforms")]
    public async Task<IActionResult> GetPlatformAnalytics([FromQuery] DateTime fromUtc, [FromQuery] DateTime toUtc)
    {
        var workspaceId = Guid.Parse("d4d1c5b5-1b1b-4b1b-8b1b-1b1b1b1b1b1b");
        var platforms = await _analyticsService.GetPlatformAnalyticsAsync(workspaceId, fromUtc, toUtc);
        return Ok(platforms);
    }

    [HttpGet("heatmap")]
    public async Task<IActionResult> GetHeatmap([FromQuery] DateTime fromUtc, [FromQuery] DateTime toUtc)
    {
        var workspaceId = Guid.Parse("d4d1c5b5-1b1b-4b1b-8b1b-1b1b1b1b1b1b");
        var heatmap = await _analyticsService.GetHeatmapAsync(workspaceId, fromUtc, toUtc);
        return Ok(heatmap);
    }
}