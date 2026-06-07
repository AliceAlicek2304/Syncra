using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Api.Middleware;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/inbox/analytics")]
public class InboxAnalyticsController : ControllerBase
{
    private readonly IInboxAnalyticsService _service;
    private readonly ILogger<InboxAnalyticsController> _logger;

    public InboxAnalyticsController(
        IInboxAnalyticsService service,
        ILogger<InboxAnalyticsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet("volume")]
    public async Task<IActionResult> GetVolume(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        [FromQuery] string? platform,
        [FromQuery] string? accountId,
        [FromQuery] string? source,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.GetVolumeAsync(
                RequireWorkspaceId(),
                new InboxAnalyticsFilters(fromDate, toDate, profileId, platform, accountId, source, null, null, null, null, null),
                cancellationToken));
    }

    [HttpGet("top-accounts")]
    public async Task<IActionResult> GetTopAccounts(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        [FromQuery] string? platform,
        [FromQuery] string? source,
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.GetTopAccountsAsync(
                RequireWorkspaceId(),
                new InboxAnalyticsFilters(fromDate, toDate, profileId, platform, null, source, null, limit, null, null, null),
                cancellationToken));
    }

    [HttpGet("source-breakdown")]
    public async Task<IActionResult> GetSourceBreakdown(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        [FromQuery] string? platform,
        [FromQuery] string? accountId,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.GetSourceBreakdownAsync(
                RequireWorkspaceId(),
                new InboxAnalyticsFilters(fromDate, toDate, profileId, platform, accountId, null, null, null, null, null, null),
                cancellationToken));
    }

    [HttpGet("response-time")]
    public async Task<IActionResult> GetResponseTime(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        [FromQuery] string? platform,
        [FromQuery] string? accountId,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.GetResponseTimeAsync(
                RequireWorkspaceId(),
                new InboxAnalyticsFilters(fromDate, toDate, profileId, platform, accountId, null, null, null, null, null, null),
                cancellationToken));
    }

    [HttpGet("heatmap")]
    public async Task<IActionResult> GetHeatmap(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        [FromQuery] string? platform,
        [FromQuery] string? accountId,
        [FromQuery] string? source,
        [FromQuery] string? action,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.GetHeatmapAsync(
                RequireWorkspaceId(),
                new InboxAnalyticsFilters(fromDate, toDate, profileId, platform, accountId, source, action, null, null, null, null),
                cancellationToken));
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> ListConversations(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        [FromQuery] string? platform,
        [FromQuery] string? accountId,
        [FromQuery] string? source,
        [FromQuery] int? limit,
        [FromQuery] int? page,
        [FromQuery] string? sortBy,
        [FromQuery] string? order,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.ListConversationsAsync(
                RequireWorkspaceId(),
                new InboxAnalyticsFilters(fromDate, toDate, profileId, platform, accountId, source, null, limit, page, sortBy, order),
                cancellationToken));
    }

    [HttpGet("conversations/{conversationId}")]
    public async Task<IActionResult> GetConversationDetail(
        string conversationId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? profileId,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => _service.GetConversationDetailAsync(
                RequireWorkspaceId(),
                conversationId,
                new InboxAnalyticsFilters(fromDate, toDate, profileId, null, null, null, null, null, null, null, null),
                cancellationToken));
    }

    // ── Private helpers ─────────────────────────────────────────

    private Guid RequireWorkspaceId()
        => HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?
           ?? throw new UnauthorizedAccessException("Workspace context missing.");

    private async Task<IActionResult> ExecuteAsync<T>(Func<Task<Syncra.Domain.Common.Result<T>>> action)
    {
        try
        {
            var result = await action();
            if (result.IsSuccess) return Ok(result.Value);

            return result.Error switch
            {
                "zernio_not_connected" => StatusCode(404, new { code = result.Error, message = "Connect Zernio to see analytics." }),
                _ => StatusCode(500, new { code = "zernio_inbox_analytics_error", message = result.Error ?? "Failed to fetch inbox analytics." })
            };
        }
        catch (ZernioBillingRequiredException ex)
        {
            return StatusCode(402, new { code = ex.Reason, message = ex.Message, dashboardUrl = ex.DashboardUrl });
        }
        catch (ZernioAnalyticsScopeException ex)
        {
            return StatusCode(412, new { code = "zernio_analytics_scope", message = ex.Message });
        }
        catch (ZernioUnauthorizedException ex)
        {
            return StatusCode(401, new { code = "zernio_unauthorized", message = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return StatusCode(404, new { code = "zernio_not_found", message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { code = "unauthorized", message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in inbox analytics endpoint");
            return StatusCode(500, new { code = "internal_error", message = "Internal server error." });
        }
    }
}
