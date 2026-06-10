using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Features.Analytics.Queries;
using MediatR;
using Syncra.Api.Common;
using Syncra.Api.Middleware;
using Syncra.Application.Common.Helpers;
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
        var profileIds = await ResolveProfileIdsAsync(profileId);

        if (profileIds.Count == 0)
        {
            _logger.LogInformation("No active Zernio profile for current context.");
            return Ok(new ZernioDailyMetricsDto(
                Array.Empty<ZernioDailyDataPointDto>(),
                Array.Empty<ZernioPlatformBreakdownDto>()));
        }

        fromDate ??= DateTime.UtcNow.AddDays(-180);
        toDate ??= DateTime.UtcNow;

        try
        {
            var fetchResults = await FetchFromProfilesAsync(profileIds,
                pid => _zernioClient.GetDailyMetricsAsync(pid, fromDate.Value, toDate.Value, platform, accountId, source, cancellationToken));

            var successful = fetchResults.Successes;

            if (successful.Count == 0)
            {
                var billingError = fetchResults.Errors.OfType<ZernioBillingRequiredException>().FirstOrDefault();
                if (billingError != null) throw billingError;
                var scopeError = fetchResults.Errors.OfType<ZernioAnalyticsScopeException>().FirstOrDefault();
                if (scopeError != null) throw scopeError;
                var firstError = fetchResults.Errors.FirstOrDefault();
                if (firstError != null) throw firstError;

                return Ok(new ZernioDailyMetricsDto(
                    Array.Empty<ZernioDailyDataPointDto>(),
                    Array.Empty<ZernioPlatformBreakdownDto>()));
            }

            if (successful.Count == 1)
                return Ok(successful[0]);

            return Ok(ZernioAggregationHelper.AggregateDailyMetrics(successful));
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

    private sealed record ProfileFetchResults<T>(List<T> Successes, List<Exception> Errors);

    private async Task<ProfileFetchResults<T>> FetchFromProfilesAsync<T>(
        IReadOnlyList<string> profileIds,
        Func<string, Task<T>> fetchFn) where T : class
    {
        var successes = new List<T>();
        var errors = new List<Exception>();
        var lockObj = new object();

        var tasks = profileIds.Select(async pid =>
        {
            try
            {
                var result = await fetchFn(pid);
                lock (lockObj) { successes.Add(result); }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch analytics data for profile {ProfileId}", pid);
                lock (lockObj) { errors.Add(ex); }
            }
        });

        await Task.WhenAll(tasks);
        return new ProfileFetchResults<T>(successes, errors);
    }

    private async Task<IReadOnlyList<string>> ResolveProfileIdsAsync(string? profileId)
    {
        var workspaceId = HttpContext.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (!workspaceId.HasValue)
            return Array.Empty<string>();

        // Always validate against the workspace's own active profiles
        var workspaceProfiles = await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(workspaceId.Value);
        if (workspaceProfiles.Count == 0)
            return Array.Empty<string>();

        var validProfileIds = workspaceProfiles.Select(p => p.ZernioProfileId).ToHashSet();

        if (!string.IsNullOrEmpty(profileId) && !string.Equals(profileId, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (validProfileIds.Contains(profileId))
                return new[] { profileId };

            // Check if it's the database profile GUID
            if (Guid.TryParse(profileId, out var profileGuid))
            {
                var profile = workspaceProfiles.FirstOrDefault(p => p.Id == profileGuid);
                if (profile is not null)
                    return new[] { profile.ZernioProfileId };
            }

            _logger.LogWarning("Requested profileId {ProfileId} does not belong to workspace {WorkspaceId}", profileId, workspaceId);
            return Array.Empty<string>();
        }

        if (string.Equals(profileId, "all", StringComparison.OrdinalIgnoreCase))
        {
            return workspaceProfiles.Select(p => p.ZernioProfileId).ToList();
        }

        // 3. null or empty — fall back to X-Profile-Id header (if present)
        var explicitProfileId = HttpContext.Items[Middleware.ProfileResolutionMiddleware.ProfileIdKey] as Guid?;
        if (explicitProfileId != null)
        {
            var profile = workspaceProfiles.FirstOrDefault(p => p.Id == explicitProfileId.Value);
            if (profile is not null)
                return new[] { profile.ZernioProfileId };
            return Array.Empty<string>();
        }

        return workspaceProfiles.Select(p => p.ZernioProfileId).ToList();
    }

    [HttpGet("posting-frequency")]
    public async Task<IActionResult> GetPostingFrequency(
        [FromQuery] string? platform = null,
        [FromQuery] string? profileId = null,
        [FromQuery] string? accountId = null,
        [FromQuery] string? source = "all",
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(profileId);
        if (profileIds.Count == 0)
            return Ok(new ZernioPostingFrequencyResponseDto(null));

        try
        {
            var fetchResults = await FetchFromProfilesAsync(profileIds,
                pid => _zernioClient.GetPostingFrequencyAsync(platform, pid, accountId, source, cancellationToken));

            var successful = fetchResults.Successes;

            if (successful.Count == 0)
            {
                var billing = fetchResults.Errors.OfType<ZernioBillingRequiredException>().FirstOrDefault();
                if (billing != null) throw billing;
                var scope = fetchResults.Errors.OfType<ZernioAnalyticsScopeException>().FirstOrDefault();
                if (scope != null) throw scope;
                var firstError = fetchResults.Errors.FirstOrDefault();
                if (firstError != null) throw firstError;
                return Ok(new ZernioPostingFrequencyResponseDto(null));
            }

            if (successful.Count == 1)
                return Ok(successful[0]);

            return Ok(ZernioAggregationHelper.AggregatePostingFrequency(successful));
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
        var profileIds = await ResolveProfileIdsAsync(profileId);

        DateOnly? parsedFrom = DateOnly.TryParse(fromDate, out var f) ? f : null;
        DateOnly? parsedTo = DateOnly.TryParse(toDate, out var t) ? t : null;

        try
        {
            if (string.IsNullOrWhiteSpace(postId))
            {
                if (profileIds.Count == 0)
                    return Ok(new ZernioPostAnalyticsListDto());

                // For multi-profile aggregation, fetch enough data from each profile
                // then merge, sort, and paginate in-memory.
                // Pass page=1 and limit=page*limit to avoid per-profile pagination skew.
                int? fetchLimit;
                int? fetchPage;
                if (profileIds.Count > 1 && limit.HasValue && page.HasValue)
                {
                    fetchLimit = limit.Value * page.Value;
                    fetchPage = 1;
                }
                else
                {
                    fetchLimit = limit;
                    fetchPage = page;
                }

                var fetchResults = await FetchFromProfilesAsync(profileIds,
                    pid => _zernioClient.GetAnalyticsListAsync(platform, pid, accountId, source, parsedFrom, parsedTo, fetchLimit, fetchPage, sortBy, order, cancellationToken));

                var successful = fetchResults.Successes;

                if (successful.Count == 0)
                {
                    var billing = fetchResults.Errors.OfType<ZernioBillingRequiredException>().FirstOrDefault();
                    if (billing != null) throw billing;
                    var scope = fetchResults.Errors.OfType<ZernioAnalyticsScopeException>().FirstOrDefault();
                    if (scope != null) throw scope;
                    var firstError = fetchResults.Errors.FirstOrDefault();
                    if (firstError != null) throw firstError;
                    return Ok(new ZernioPostAnalyticsListDto());
                }

                if (successful.Count == 1)
                    return Ok(successful[0]);

                return Ok(ZernioAggregationHelper.AggregatePostAnalyticsList(successful, sortBy, order, page, limit));
            }

            var pid = profileIds.Count > 0 ? profileIds[0] : null;
            var result = await _zernioClient.GetPostAnalyticsAsync(
                postId,
                platform,
                pid,
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
        var profileIds = await ResolveProfileIdsAsync(profileId);
        if (profileIds.Count == 0)
            return Ok(new ZernioBestTimeDto(Array.Empty<ZernioBestTimeSlotDto>()));

        try
        {
            var fetchResults = await FetchFromProfilesAsync(profileIds,
                pid => _zernioClient.GetBestTimeAsync(pid, platform, accountId, source, cancellationToken));

            var successful = fetchResults.Successes;

            if (successful.Count == 0)
            {
                var billing = fetchResults.Errors.OfType<ZernioBillingRequiredException>().FirstOrDefault();
                if (billing != null) throw billing;
                var scope = fetchResults.Errors.OfType<ZernioAnalyticsScopeException>().FirstOrDefault();
                if (scope != null) throw scope;
                var firstError = fetchResults.Errors.FirstOrDefault();
                if (firstError != null) throw firstError;
                return Ok(new ZernioBestTimeDto(Array.Empty<ZernioBestTimeSlotDto>()));
            }

            if (successful.Count == 1)
                return Ok(successful[0]);

            return Ok(ZernioAggregationHelper.AggregateBestTime(successful));
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
        var profileIds = await ResolveProfileIdsAsync(profileId);
        if (profileIds.Count == 0)
            return Ok(new ZernioContentDecayResponseDto(Array.Empty<ZernioContentDecayBucketDto>()));

        try
        {
            var fetchResults = await FetchFromProfilesAsync(profileIds,
                pid => _zernioClient.GetContentDecayAsync(platform, pid, accountId, source, cancellationToken));

            var successful = fetchResults.Successes;

            if (successful.Count == 0)
            {
                var billing = fetchResults.Errors.OfType<ZernioBillingRequiredException>().FirstOrDefault();
                if (billing != null) throw billing;
                var scope = fetchResults.Errors.OfType<ZernioAnalyticsScopeException>().FirstOrDefault();
                if (scope != null) throw scope;
                var firstError = fetchResults.Errors.FirstOrDefault();
                if (firstError != null) throw firstError;
                return Ok(new ZernioContentDecayResponseDto(Array.Empty<ZernioContentDecayBucketDto>()));
            }

            if (successful.Count == 1)
                return Ok(successful[0]);

            return Ok(ZernioAggregationHelper.AggregateContentDecay(successful));
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
        DateTime? parsedFrom = DateTime.TryParse(fromDate, out var f) ? f : null;
        DateTime? parsedTo = DateTime.TryParse(toDate, out var t) ? t : null;

        var profileIds = await ResolveProfileIdsAsync(profileId);

        if (profileIds.Count == 0)
        {
            _logger.LogInformation("No active Zernio profile for current context.");
            return Ok(new ZernioFollowerStatsResponseDto(
                Array.Empty<ZernioFollowerStatsAccountDto>(),
                null, null, null));
        }

        try
        {
            var fetchResults = await FetchFromProfilesAsync(profileIds,
                pid => _zernioClient.GetFollowerStatsAsync(accountIds, pid, parsedFrom, parsedTo, granularity, cancellationToken));

            var successful = fetchResults.Successes;

            if (successful.Count == 0)
            {
                var billing = fetchResults.Errors.OfType<ZernioBillingRequiredException>().FirstOrDefault();
                if (billing != null) throw billing;
                var scope = fetchResults.Errors.OfType<ZernioAnalyticsScopeException>().FirstOrDefault();
                if (scope != null) throw scope;
                var firstError = fetchResults.Errors.FirstOrDefault();
                if (firstError != null) throw firstError;
                return Ok(new ZernioFollowerStatsResponseDto(
                    Array.Empty<ZernioFollowerStatsAccountDto>(),
                    null, null, null));
            }

            if (successful.Count == 1)
                return Ok(successful[0]);

            return Ok(ZernioAggregationHelper.AggregateFollowerStats(successful));
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

