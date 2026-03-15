using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Application.Services;

namespace Syncra.Api.Controllers;

/// <summary>
/// Matches Potiz analytics.controller.ts exactly.
/// GET /analytics/:integration  → checkAnalytics()
/// GET /analytics/post/:postId  → checkPostAnalytics()
/// GET /analytics/summary       → aggregate analytics across all integrations
/// </summary>
[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IIntegrationAnalyticsService _analyticsService;
    private readonly IPostRepository _postRepository;
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;

    public AnalyticsController(
        IIntegrationAnalyticsService analyticsService,
        IPostRepository postRepository,
        IWorkspaceAnalyticsService workspaceAnalyticsService)
    {
        _analyticsService = analyticsService;
        _postRepository = postRepository;
        _workspaceAnalyticsService = workspaceAnalyticsService;
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/{integrationId}?date=30
    /// Matches Potiz analytics.controller.ts:16 getIntegration().
    /// </summary>
    [HttpGet("{integrationId:guid}")]
    public async Task<IActionResult> GetIntegrationAnalytics(
        Guid workspaceId,
        Guid integrationId,
        [FromQuery] int date = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.CheckAnalyticsAsync(
            workspaceId, integrationId, date, cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/post/{postId}?date=30
    /// Matches Potiz analytics.controller.ts:25 getPostAnalytics().
    /// </summary>
    [HttpGet("post/{postId:guid}")]
    public async Task<IActionResult> GetPostAnalytics(
        Guid workspaceId,
        Guid postId,
        [FromQuery] int date = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.CheckPostAnalyticsAsync(
            workspaceId, postId, date, cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/post/{postId}/debug
    /// Debug endpoint — dumps raw post + integration state to diagnose empty analytics.
    /// </summary>
    [HttpGet("post/{postId:guid}/debug")]
    public async Task<IActionResult> DebugPost(Guid workspaceId, Guid postId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
            return NotFound(new { error = "Post not found" });

        return Ok(new
        {
            postId = post.Id,
            workspaceId = post.WorkspaceId,
            workspaceMatch = post.WorkspaceId == workspaceId,
            status = post.Status.ToString(),
            publishExternalId = post.PublishExternalId,
            publishExternalUrl = post.PublishExternalUrl,
            integrationId = post.IntegrationId,
            integrationPlatform = post.Integration?.Platform,
            integrationExternalAccountId = post.Integration?.ExternalAccountId,
            integrationHasToken = !string.IsNullOrEmpty(post.Integration?.AccessToken),
            integrationTokenExpiresAt = post.Integration?.ExpiresAtUtc,
            integrationIsActive = post.Integration?.IsActive
        });
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/summary?date=30
    /// Aggregate analytics across all active integrations in the workspace.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetWorkspaceSummary(
        Guid workspaceId,
        [FromQuery] int date = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _workspaceAnalyticsService.GetSummaryAsync(
            workspaceId, date, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/heatmap?date=90
    /// Best posting times heatmap - group published posts by DayOfWeek × Hour.
    /// </summary>
    [HttpGet("heatmap")]
    public async Task<IActionResult> GetWorkspaceHeatmap(
        Guid workspaceId,
        [FromQuery] int date = 90,
        CancellationToken cancellationToken = default)
    {
        var result = await _workspaceAnalyticsService.GetHeatmapAsync(
            workspaceId, date, cancellationToken);
        return Ok(result);
    }
}
