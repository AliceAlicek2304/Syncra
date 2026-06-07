using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Services;

public sealed class ZernioWorkspaceAnalyticsService : IZernioWorkspaceAnalyticsService
{
    private static readonly int[] ValidPresets = [7, 30, 90];

    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IAnalyticsCache _cache;
    private readonly ILogger<ZernioWorkspaceAnalyticsService> _logger;

    public ZernioWorkspaceAnalyticsService(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        ISocialAccountRepository socialAccountRepository,
        IAnalyticsCache cache,
        ILogger<ZernioWorkspaceAnalyticsService> logger)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _socialAccountRepository = socialAccountRepository;
        _cache = cache;
        _logger = logger;
    }

    public async Task<Result<WorkspaceAnalyticsSummaryDto>> GetSummaryAsync(
        Guid workspaceId,
        int date = 30,
        CancellationToken cancellationToken = default)
    {
        // Validate preset
        if (!ValidPresets.Contains(date))
            date = 30;

        // Cache-aside: check cache first
        var cacheKey = $"zernio:analytics:summary:{workspaceId}:{date}";
        var cached = await _cache.GetAsync<WorkspaceAnalyticsSummaryDto>(cacheKey, cancellationToken);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit for Zernio analytics summary: {WorkspaceId}, days={Date}", workspaceId, date);
            return Result.Success(cached);
        }

        // Resolve Zernio profile — if absent, return empty summary (dual-path A4)
        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId);
        if (profile is null || !profile.IsActive)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return Result.Success(EmptySummary());
        }

        // Calculate date range from preset
        var toDate = DateTime.UtcNow.Date;
        var fromDate = toDate.AddDays(-date);

        // Fetch daily metrics from Zernio
        var dailyMetrics = await _zernioClient.GetDailyMetricsAsync(
            profileId: profile.ZernioProfileId, fromDate: fromDate, toDate: toDate, cancellationToken: cancellationToken);

        // Build summary from daily metrics
        var summary = BuildSummaryFromDailyMetrics(dailyMetrics);

        // Enrich with platform scope status (D-07)
        summary = await EnrichPlatformBreakdownAsync(profile.ZernioProfileId, workspaceId, summary, cancellationToken);

        // Cache with 60-minute TTL (D-03)
        await _cache.SetAsync(cacheKey, summary, TimeSpan.FromMinutes(60), cancellationToken);

        return Result.Success(summary);
    }

    public async Task<Result<HeatmapDto>> GetHeatmapAsync(
        Guid workspaceId,
        int date = 90,
        string? platform = null,
        CancellationToken cancellationToken = default)
    {
        // Validate preset
        if (!ValidPresets.Contains(date))
            date = 90;

        // Cache-aside: check cache first (D-03)
        var platformSuffix = string.IsNullOrEmpty(platform) ? "all" : platform;
        var cacheKey = $"zernio:analytics:heatmap:{workspaceId}:{date}:{platformSuffix}";
        var cached = await _cache.GetAsync<HeatmapDto>(cacheKey, cancellationToken);
        if (cached != null)
        {
            _logger.LogInformation(
                "Cache hit for Zernio heatmap: {WorkspaceId}, days={Date}, platform={Platform}",
                workspaceId, date, platformSuffix);
            return Result.Success(cached);
        }

        // Resolve Zernio profile — if absent, return empty heatmap
        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId);
        if (profile is null || !profile.IsActive)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return Result.Success(new HeatmapDto(Array.Empty<HeatmapSlotDto>()));
        }

        // Fetch best-time slots from Zernio (UTC, no timezone shift - D-01/D-02)
        var bestTime = await _zernioClient.GetBestTimeAsync(
            profileId: profile.ZernioProfileId, platform: platform, cancellationToken: cancellationToken);

        // Map Zernio slots to HeatmapSlotDto — preserve UTC DayOfWeek and Hour (D-01)
        // Score = avg_engagement rounded to int using AwayFromZero (documented in plan)
        var slots = bestTime.Slots
            .Select(s => new HeatmapSlotDto(
                DayOfWeek: s.DayOfWeek,
                Hour: s.Hour,
                Score: (int)Math.Round(s.AvgEngagement, MidpointRounding.AwayFromZero)))
            .ToList();

        var result = new HeatmapDto(slots);

        // Cache with 60-minute TTL (D-03)
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(60), cancellationToken);

        return Result.Success(result);
    }

    // ── Private helpers ─────────────────────────────────────────

    private static WorkspaceAnalyticsSummaryDto EmptySummary()
        => new(0, 0, 0, 0, Array.Empty<WeeklyReachDto>());

    private static WorkspaceAnalyticsSummaryDto BuildSummaryFromDailyMetrics(
        ZernioDailyMetricsDto dailyMetrics)
    {
        var dailyData = dailyMetrics.DailyData;

        var totalReach = dailyData.Sum(d => d.Metrics.Reach);
        var totalImpressions = dailyData.Sum(d => d.Metrics.Impressions);
        var totalLikes = dailyData.Sum(d => d.Metrics.Likes);
        var totalComments = dailyData.Sum(d => d.Metrics.Comments);
        var totalShares = dailyData.Sum(d => d.Metrics.Shares);
        var totalEngagements = totalLikes + totalComments + totalShares;
        var engagementRate = totalImpressions > 0
            ? Math.Round((double)totalEngagements / totalImpressions * 100, 2)
            : 0.0;
        var totalPosts = dailyData.Sum(d => d.PostCount);
        var totalFollowerGrowth = dailyData.Sum(d => d.Metrics.Saves);

        var weeklyReach = dailyData
            .GroupBy(d =>
            {
                if (!DateOnly.TryParse(d.Date, out var dateOnly))
                    return DateOnly.MinValue;

                var dow = (int)dateOnly.DayOfWeek;
                var monday = dateOnly.AddDays(-(dow == 0 ? 6 : dow - 1));
                return monday;
            })
            .Where(g => g.Key != DateOnly.MinValue)
            .OrderBy(g => g.Key)
            .Select(g => new WeeklyReachDto(
                WeekStart: g.Key.ToString("yyyy-MM-dd"),
                Reach: g.Sum(d => d.Metrics.Reach)))
            .ToList();

        var platformBreakdown = dailyMetrics.PlatformBreakdown
            .Select(p => new PlatformBreakdownDto(
                p.Platform, (int)p.PostCount, (int)p.Impressions, (int)p.Reach,
                (int)p.Likes, (int)p.Comments, (int)p.Shares, (int)p.Saves, (int)p.Clicks, (int)p.Views))
            .ToList();

        return new WorkspaceAnalyticsSummaryDto(
            totalReach,
            engagementRate,
            totalFollowerGrowth,
            totalPosts,
            weeklyReach,
            platformBreakdown);
    }

    /// <summary>
    /// Enriches platform breakdown with scope status (D-07):
    /// iterates workspace SocialAccount rows grouped by platform and
    /// marks RequiresReauth when Zernio returns 412 for that platform.
    /// </summary>
    private async Task<WorkspaceAnalyticsSummaryDto> EnrichPlatformBreakdownAsync(
        string profileId,
        Guid workspaceId,
        WorkspaceAnalyticsSummaryDto summary,
        CancellationToken cancellationToken)
    {
        if (summary.PlatformBreakdown is null || summary.PlatformBreakdown.Count == 0)
            return summary;

        // Get social accounts for this workspace with Zernio account IDs
        var allAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspaceId);
        var connectedAccounts = allAccounts
            .Where(sa => sa.IsActive && !string.IsNullOrEmpty(sa.ExternalAccountId))
            .ToList();

        if (connectedAccounts.Count == 0)
            return summary;

        var platformToAccount = connectedAccounts
            .GroupBy(sa => sa.Platform)
            .ToDictionary(g => g.Key, g => g.First());

        var enriched = new List<PlatformBreakdownDto>();
        foreach (var pb in summary.PlatformBreakdown)
        {
            if (!platformToAccount.TryGetValue(pb.Platform, out var account))
            {
                enriched.Add(pb);
                continue;
            }

            try
            {
                // Call a Zernio analytics endpoint for this platform/account
                // If it throws ZernioAnalyticsScopeException (412), the account needs reauth
                await _zernioClient.GetDailyMetricsAsync(
                    profileId: profileId, fromDate: DateTime.UtcNow.AddDays(-7), toDate: DateTime.UtcNow, cancellationToken: cancellationToken);

                // Success — scope is valid
                enriched.Add(pb);
            }
            catch (ZernioAnalyticsScopeException ex)
            {
                _logger.LogWarning(ex, "Zernio analytics scope missing for platform {Platform}", pb.Platform);
                enriched.Add(pb with { RequiresReauth = true, ReauthorizeUrl = ex.ReauthorizeUrl });
            }
            catch (ZernioBillingRequiredException)
            {
                // Billing gate — not a scope issue, leave as-is
                enriched.Add(pb);
            }
            catch (Exception ex)
            {
                // Transient errors — assume scope is valid
                _logger.LogWarning(ex, "Non-scope error checking platform scope for {Platform}", pb.Platform);
                enriched.Add(pb);
            }
        }

        return summary with { PlatformBreakdown = enriched };
    }
}
