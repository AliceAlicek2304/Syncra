using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.Repositories;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsAdapterRegistry _analyticsRegistry;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IDistributedCache _cache;
    private readonly ILogger<AnalyticsController> _logger;

    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15)
    };

    public AnalyticsController(
        IAnalyticsAdapterRegistry analyticsRegistry,
        IIntegrationRepository integrationRepository,
        IDistributedCache cache,
        ILogger<AnalyticsController> logger)
    {
        _analyticsRegistry = analyticsRegistry;
        _integrationRepository = integrationRepository;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/{providerId}/post/{externalId}
    /// Returns analytics for a specific post/video.
    /// </summary>
    [HttpGet("{providerId}/post/{externalId}")]
    public async Task<IActionResult> GetPostAnalytics(
        Guid workspaceId,
        string providerId,
        string externalId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] bool? isShort,
        CancellationToken cancellationToken)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-28);
        var end = endDate ?? DateTime.UtcNow;

        var cacheKey = $"analytics:{workspaceId}:{providerId}:post:{externalId}:{start:yyyyMMdd}:{end:yyyyMMdd}";

        var cached = await TryGetCacheAsync(cacheKey, cancellationToken);
        if (cached != null)
        {
            return Content(cached, "application/json");
        }

        var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(workspaceId, providerId);
        if (integration == null || !integration.IsActive)
        {
            return NotFound(new { error = $"No active {providerId} integration found for this workspace." });
        }

        var adapter = _analyticsRegistry.GetAdapterOrDefault(providerId);
        if (adapter == null)
        {
            return NotFound(new { error = "Provider not supported." });
        }

        try
        {
            var request = new AnalyticsRequest
            {
                ExternalId = externalId,
                AccountId = integration.ExternalAccountId,
                StartDateUtc = start,
                EndDateUtc = end,
                IsShort = isShort
            };

            var result = await adapter.GetPostAnalyticsAsync(integration.AccessToken!, request, cancellationToken);

            if (!result.IsSuccess)
            {
                return UnprocessableEntity(new { error = result.Error });
            }

            var json = JsonSerializer.Serialize(result);
            await TrySetCacheAsync(cacheKey, json, cancellationToken);

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching post analytics for {ProviderId}/{ExternalId}", providerId, externalId);
            return StatusCode(500, new { error = "An error occurred while fetching analytics." });
        }
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/analytics/{providerId}/account
    /// Returns aggregate analytics for the channel/page/profile.
    /// </summary>
    [HttpGet("{providerId}/account")]
    public async Task<IActionResult> GetAccountAnalytics(
        Guid workspaceId,
        string providerId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken cancellationToken)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-28);
        var end = endDate ?? DateTime.UtcNow;

        var cacheKey = $"analytics:{workspaceId}:{providerId}:account:{start:yyyyMMdd}:{end:yyyyMMdd}";

        var cached = await TryGetCacheAsync(cacheKey, cancellationToken);
        if (cached != null)
        {
            return Content(cached, "application/json");
        }

        var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(workspaceId, providerId);
        if (integration == null || !integration.IsActive)
        {
            return NotFound(new { error = $"No active {providerId} integration found for this workspace." });
        }

        var adapter = _analyticsRegistry.GetAdapterOrDefault(providerId);
        if (adapter == null)
        {
            return NotFound(new { error = "Provider not supported." });
        }

        try
        {
            var request = new AnalyticsRequest
            {
                AccountId = integration.ExternalAccountId,
                StartDateUtc = start,
                EndDateUtc = end
            };

            var result = await adapter.GetAccountAnalyticsAsync(integration.AccessToken!, request, cancellationToken);

            if (!result.IsSuccess)
            {
                return UnprocessableEntity(new { error = result.Error });
            }

            var json = JsonSerializer.Serialize(result);
            await TrySetCacheAsync(cacheKey, json, cancellationToken);

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching account analytics for {ProviderId}", providerId);
            return StatusCode(500, new { error = "An error occurred while fetching analytics." });
        }
    }

    private async Task<string?> TryGetCacheAsync(string key, CancellationToken ct)
    {
        try { return await _cache.GetStringAsync(key, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Redis get failed for key {Key}", key); return null; }
    }

    private async Task TrySetCacheAsync(string key, string value, CancellationToken ct)
    {
        try { await _cache.SetStringAsync(key, value, CacheOptions, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Redis set failed for key {Key}", key); }
    }
}
