using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Api.Middleware;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/analytics")]
public class DailyMetricsController : ControllerBase
{
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ILogger<DailyMetricsController> _logger;

    public DailyMetricsController(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        ILogger<DailyMetricsController> logger)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _logger = logger;
    }

    [HttpGet("daily-metrics")]
    public async Task<IActionResult> GetDailyMetrics(
        [FromQuery] DateTime? fromDate,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId is null)
        {
            return BadRequest(new { error = "Workspace context required. Set X-Workspace-Id header." });
        }

        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId.Value);
        if (profile is null || !profile.IsActive)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return Ok(new ZernioDailyMetricsDto(
                Array.Empty<ZernioDailyDataPointDto>(),
                null));
        }

        try
        {
            var metrics = await _zernioClient.GetDailyMetricsAsync(
                profile.ZernioProfileId,
                fromDate,
                null,
                cancellationToken);

            return Ok(metrics);
        }
        catch (ZernioBillingRequiredException ex)
        {
            return StatusCode(402, new
            {
                code = "analytics_addon_required",
                message = ex.Message,
                dashboardUrl = ex.DashboardUrl
            });
        }
        catch (ZernioAnalyticsScopeException ex)
        {
            return StatusCode(412, new
            {
                code = "analytics_scope_missing",
                message = ex.Message,
                reauthorizeUrl = ex.ReauthorizeUrl,
                platform = ex.Platform
            });
        }
    }
}
