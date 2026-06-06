using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Features.Analytics.Queries;
using MediatR;
using Syncra.Api.Common;
using Syncra.Api.Middleware;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(
        IMediator mediator,
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        ILogger<AnalyticsController> logger)
    {
        _mediator = mediator;
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _logger = logger;
    }

    [HttpGet("daily-metrics")]
    public async Task<IActionResult> GetDailyMetrics(
        [FromQuery] string? platform,
        [FromQuery] string? profileId,
        [FromQuery] string? accountId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? source = "all",
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        
        ZernioProfile? profile = null;
        if (workspaceId.HasValue)
        {
            profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId.Value);
        }

        if (string.IsNullOrEmpty(profileId))
        {
            if (workspaceId.HasValue)
            {
                if (profile is null || !profile.IsActive)
                {
                    _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
                    return Ok(new ZernioDailyMetricsDto(
                        Array.Empty<ZernioDailyDataPointDto>(),
                        Array.Empty<ZernioPlatformBreakdownDto>()));
                }
                profileId = profile.ZernioProfileId;
            }
            // else: no workspace context, no profileId → null passes to Zernio for all profiles
        }

        // Apply defaults from spec if not provided
        fromDate ??= DateTime.UtcNow.AddDays(-180);
        toDate ??= DateTime.UtcNow;

        try
        {
            var metrics = await _zernioClient.GetDailyMetricsAsync(
                profileId,
                fromDate,
                toDate,
                platform,
                accountId,
                source,
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

    [HttpGet("accounts/{accountId}/linkedin-post-analytics")]
    public async Task<IActionResult> GetLinkedInPostAnalytics(
        string accountId,
        [FromQuery] string urn,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "accountId is required." });

        if (string.IsNullOrWhiteSpace(urn))
            return BadRequest(new { error = "urn is required." });

        try
        {
            var result = await _zernioClient.GetLinkedInPostAnalyticsAsync(
                accountId,
                urn,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("accounts/{accountId}/linkedin-post-reactions")]
    public async Task<IActionResult> GetLinkedInPostReactions(
        string accountId,
        [FromQuery] string urn,
        [FromQuery] int? limit = 25,
        [FromQuery] string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "accountId is required." });

        if (string.IsNullOrWhiteSpace(urn))
            return BadRequest(new { error = "urn is required." });

        try
        {
            var result = await _zernioClient.GetLinkedInPostReactionsAsync(
                accountId,
                urn,
                limit,
                cursor,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("googlebusiness/performance")]
    public async Task<IActionResult> GetGoogleBusinessPerformance(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        DateOnly? parsedStart = DateOnly.TryParse(startDate, out var s) ? s : null;
        DateOnly? parsedEnd = DateOnly.TryParse(endDate, out var e) ? e : null;

        try
        {
            var result = await _zernioClient.GetGoogleBusinessPerformanceAsync(
                accountId,
                metrics,
                parsedStart,
                parsedEnd,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                code = ex.ErrorCode,
                validMetrics = Syncra.Infrastructure.Services.ZernioAnalyticsValidator.ValidGoogleBusinessMetrics
            });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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

    [HttpGet("facebook/page-insights")]
    public async Task<IActionResult> GetFacebookPageInsightsAsync(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? since = null,
        [FromQuery] string? until = null,
        [FromQuery] string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "accountId is required." });

        try
        {
            var result = await _zernioClient.GetFacebookPageInsightsAsync(
                accountId,
                metrics,
                since,
                until,
                metricType,
                cancellationToken);

            return Ok(result);
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

    [HttpGet("youtube/daily-views")]
    public async Task<IActionResult> GetYouTubeDailyViews(
        [FromQuery] string videoId,
        [FromQuery] string accountId,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(videoId))
            return BadRequest(new { error = "videoId is required." });

        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "accountId is required." });

        DateOnly? parsedStart = DateOnly.TryParse(startDate, out var s) ? s : null;
        DateOnly? parsedEnd = DateOnly.TryParse(endDate, out var e) ? e : null;

        try
        {
            var result = await _zernioClient.GetYouTubeDailyViewsAsync(
                videoId,
                accountId,
                parsedStart,
                parsedEnd,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("youtube/channel-insights")]
    public async Task<IActionResult> GetYouTubeChannelInsights(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? since = null,
        [FromQuery] string? until = null,
        [FromQuery] string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        try
        {
            var result = await _zernioClient.GetYouTubeChannelInsightsAsync(
                accountId,
                metrics,
                since,
                until,
                metricType,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                code = ex.ErrorCode,
                validMetrics = Syncra.Infrastructure.Services.ZernioAnalyticsValidator.ValidYouTubeMetrics
            });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("youtube/demographics")]
    public async Task<IActionResult> GetYouTubeDemographics(
        [FromQuery] string accountId,
        [FromQuery] string? breakdown = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        try
        {
            var result = await _zernioClient.GetYouTubeDemographicsAsync(
                accountId,
                breakdown,
                startDate,
                endDate,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("tiktok/account-insights")]
    public async Task<IActionResult> GetTikTokAccountInsights(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? since = null,
        [FromQuery] string? until = null,
        [FromQuery] string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        try
        {
            var result = await _zernioClient.GetTikTokAccountInsightsAsync(
                accountId,
                metrics,
                since,
                until,
                metricType,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                code = ex.ErrorCode
            });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("googlebusiness/search-keywords")]
    public async Task<IActionResult> GetGoogleBusinessSearchKeywordsAsync(
        [FromQuery] string accountId,
        [FromQuery] string? startMonth = null,
        [FromQuery] string? endMonth = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "accountId is required." });

        try
        {
            var result = await _zernioClient.GetGoogleBusinessSearchKeywordsAsync(
                accountId,
                startMonth,
                endMonth,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
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

    [HttpGet("instagram/account-insights")]
    public async Task<IActionResult> GetInstagramAccountInsights(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? since = null,
        [FromQuery] string? until = null,
        [FromQuery] string? metricType = null,
        [FromQuery] string? breakdown = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        try
        {
            var result = await _zernioClient.GetInstagramAccountInsightsAsync(
                accountId,
                metrics,
                since,
                until,
                metricType,
                breakdown,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                code = ex.ErrorCode,
                validMetrics = Syncra.Infrastructure.Services.ZernioAnalyticsValidator.ValidInstagramMetrics
            });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("instagram/demographics")]
    public async Task<IActionResult> GetInstagramDemographics(
        [FromQuery] string accountId,
        [FromQuery] string? metric = null,
        [FromQuery] string? breakdown = null,
        [FromQuery] string? timeframe = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "accountId is required." });

        try
        {
            var result = await _zernioClient.GetInstagramDemographicsAsync(
                accountId,
                metric,
                breakdown,
                timeframe,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("instagram/follower-history")]
    public async Task<IActionResult> GetInstagramFollowerHistory(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? since = null,
        [FromQuery] string? until = null,
        [FromQuery] string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        try
        {
            var result = await _zernioClient.GetInstagramFollowerHistoryAsync(
                accountId,
                metrics,
                since,
                until,
                metricType,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                code = ex.ErrorCode,
                validMetrics = Syncra.Infrastructure.Services.ZernioAnalyticsValidator.ValidInstagramFollowerHistoryMetrics
            });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("accounts/{accountId}/linkedin-aggregate-analytics")]
    public async Task<IActionResult> GetLinkedInAggregateAnalytics(
        string accountId,
        [FromQuery] string? aggregation = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] string? metrics = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        DateOnly? parsedStart = DateOnly.TryParse(startDate, out var s) ? s : null;
        DateOnly? parsedEnd = DateOnly.TryParse(endDate, out var e) ? e : null;

        try
        {
            var result = await _zernioClient.GetLinkedInAggregateAnalyticsAsync(
                accountId,
                aggregation,
                parsedStart,
                parsedEnd,
                metrics,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                code = ex.ErrorCode,
                validMetrics = Syncra.Infrastructure.Services.ZernioAnalyticsValidator.ValidLinkedInAggregateMetrics
            });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("linkedin/org-aggregate-analytics")]
    public async Task<IActionResult> GetLinkedInOrgAggregateAnalytics(
        [FromQuery] string accountId,
        [FromQuery] string? metrics = null,
        [FromQuery] string? since = null,
        [FromQuery] string? until = null,
        [FromQuery] string? metricType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        DateOnly? parsedSince = DateOnly.TryParse(since, out var s) ? s : null;
        DateOnly? parsedUntil = DateOnly.TryParse(until, out var u) ? u : null;

        try
        {
            var result = await _zernioClient.GetLinkedInOrgAggregateAnalyticsAsync(
                accountId,
                metrics,
                parsedSince,
                parsedUntil,
                metricType,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    private async Task<string?> ResolveProfileIdAsync(string? profileId)
    {
        if (!string.IsNullOrEmpty(profileId))
            return profileId;

        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (!workspaceId.HasValue)
            return null;

        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId.Value);
        return profile?.IsActive == true ? profile.ZernioProfileId : null;
    }

    [HttpGet("posting-frequency")]
    public async Task<IActionResult> GetPostingFrequency(
        [FromQuery] string? platform = null,
        [FromQuery] string? profileId = null,
        [FromQuery] string? accountId = null,
        [FromQuery] string? source = "all",
        CancellationToken cancellationToken = default)
    {
        profileId = await ResolveProfileIdAsync(profileId);

        try
        {
            var result = await _zernioClient.GetPostingFrequencyAsync(
                platform,
                profileId,
                accountId,
                source,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    [HttpGet("post-timeline")]
    public async Task<IActionResult> GetPostTimeline(
        [FromQuery] string postId,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(postId))
            return BadRequest(new { error = "postId is required." });

        DateTime? parsedFrom = DateTime.TryParse(fromDate, out var f) ? f : null;
        DateTime? parsedTo = DateTime.TryParse(toDate, out var t) ? t : null;

        try
        {
            var result = await _zernioClient.GetPostTimelineAsync(
                postId,
                parsedFrom,
                parsedTo,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetPostAnalytics(
        [FromQuery] string? postId = null,
        [FromQuery] string? platform = null,
        [FromQuery] string? profileId = null,
        [FromQuery] string? accountId = null,
        [FromQuery] string? source = "all",
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? page = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? order = null,
        CancellationToken cancellationToken = default)
    {
        profileId = await ResolveProfileIdAsync(profileId);

        DateOnly? parsedFrom = DateOnly.TryParse(fromDate, out var f) ? f : null;
        DateOnly? parsedTo = DateOnly.TryParse(toDate, out var t) ? t : null;

        try
        {
            if (string.IsNullOrWhiteSpace(postId))
            {
                var listResult = await _zernioClient.GetAnalyticsListAsync(
                    platform,
                    profileId,
                    accountId,
                    source,
                    parsedFrom,
                    parsedTo,
                    limit,
                    page,
                    sortBy,
                    order,
                    cancellationToken);

                return Ok(listResult);
            }

            var result = await _zernioClient.GetPostAnalyticsAsync(
                postId,
                platform,
                profileId,
                accountId,
                source,
                parsedFrom,
                parsedTo,
                limit,
                page,
                sortBy,
                order,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ZernioNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ZernioServerException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
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

    [HttpGet("best-time")]
    public async Task<IActionResult> GetBestTime(
        [FromQuery] string? platform = null,
        [FromQuery] string? profileId = null,
        [FromQuery] string? accountId = null,
        [FromQuery] string? source = "all",
        CancellationToken cancellationToken = default)
    {
        profileId = await ResolveProfileIdAsync(profileId);

        try
        {
            var result = await _zernioClient.GetBestTimeAsync(
                profileId,
                platform,
                accountId,
                source,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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

    [HttpGet("content-decay")]
    public async Task<IActionResult> GetContentDecay(
        [FromQuery] string? platform = null,
        [FromQuery] string? profileId = null,
        [FromQuery] string? accountId = null,
        [FromQuery] string? source = "all",
        CancellationToken cancellationToken = default)
    {
        profileId = await ResolveProfileIdAsync(profileId);

        try
        {
            var result = await _zernioClient.GetContentDecayAsync(
                platform,
                profileId,
                accountId,
                source,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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

    [HttpGet("accounts/follower-stats")]
    public async Task<IActionResult> GetFollowerStats(
        [FromQuery] string? accountIds = null,
        [FromQuery] string? profileId = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] string? granularity = null,
        CancellationToken cancellationToken = default)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;

        DateTime? parsedFrom = DateTime.TryParse(fromDate, out var f) ? f : null;
        DateTime? parsedTo = DateTime.TryParse(toDate, out var t) ? t : null;

        ZernioProfile? profile = null;
        if (workspaceId.HasValue)
        {
            profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId.Value);
        }

        if (string.IsNullOrEmpty(profileId))
        {
            if (workspaceId.HasValue)
            {
                if (profile is null || !profile.IsActive)
                {
                    _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
                    return Ok(new ZernioFollowerStatsResponseDto(
                        Array.Empty<ZernioFollowerStatsAccountDto>(),
                        null, null, null));
                }
                profileId = profile.ZernioProfileId;
            }
        }

        try
        {
            var result = await _zernioClient.GetFollowerStatsAsync(
                accountIds,
                profileId,
                parsedFrom,
                parsedTo,
                granularity,
                cancellationToken);

            return Ok(result);
        }
        catch (ZernioBadRequestException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.ErrorCode });
        }
        catch (ZernioUnauthorizedException)
        {
            return Unauthorized(new { error = "Unauthorized" });
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
        catch (DomainException ex) when (ex.Code == "zernio_access_denied")
        {
            return StatusCode(403, new { error = ex.Message });
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

