using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Interfaces;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/trends")]
public sealed class TrendsController : ControllerBase
{
    private readonly ITrendsService _trendsService;
    private readonly ILogger<TrendsController> _logger;

    public TrendsController(
        ITrendsService trendsService,
        ILogger<TrendsController> logger)
    {
        _trendsService = trendsService;
        _logger = logger;
    }

    /// <summary>
    /// Returns trending topics and hashtags for the workspace's connected platforms.
    /// V1 returns curated trends. Future versions will integrate with external trend APIs.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetTrends(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { code = "unauthorized", message = "User not authenticated." });

        var result = await _trendsService.GetTrendsAsync(workspaceId, cancellationToken);

        if (!result.IsSuccess)
        {
            _logger.LogWarning(
                "Trends retrieval failed for workspace {WorkspaceId}: {Error}",
                workspaceId, result.Error);

            return BadRequest(new { code = "trends_failed", message = result.Error });
        }

        _logger.LogInformation(
            "Returned {TopicCount} trending topics for workspace {WorkspaceId}",
            result.Value?.TrendingTopics.Count, workspaceId);

        return Ok(result.Value);
    }
}
