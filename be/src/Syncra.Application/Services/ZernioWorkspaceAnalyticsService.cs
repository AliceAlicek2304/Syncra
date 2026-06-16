using Microsoft.Extensions.Logging;
using Syncra.Application.Common.Helpers;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Entities;
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
        string? profileId = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidPresets.Contains(date))
            date = 30;

        var cacheKey = $"zernio:analytics:summary:{workspaceId}:{profileId ?? "default"}:{date}";
        var cached = await _cache.GetAsync<WorkspaceAnalyticsSummaryDto>(cacheKey, cancellationToken);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit for Zernio analytics summary: {WorkspaceId}, days={Date}, profile={ProfileId}", workspaceId, date, profileId ?? "default");
            return Result.Success(cached);
        }

        var profiles = await ResolveProfilesAsync(workspaceId, profileId);
        if (profiles.Count == 0)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return Result.Success(EmptySummary());
        }

        var toDate = DateTime.UtcNow.Date;
        var fromDate = toDate.AddDays(-date);

        var metricsTasks = profiles.Select(p => SafeFetchDailyMetricsAsync(p.ZernioProfileId, fromDate, toDate, cancellationToken));
        var metricsResults = await Task.WhenAll(metricsTasks);
        var successfulMetrics = metricsResults.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

        if (successfulMetrics.Count == 0)
        {
            _logger.LogWarning("All profile daily-metric fetches failed for workspace {WorkspaceId}", workspaceId);

            var billingError = metricsResults.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
            if (billingError != null) throw billingError;
            var scopeError = metricsResults.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
            if (scopeError != null) throw scopeError;

            return Result.Success(EmptySummary());
        }

        var aggregatedMetrics = ZernioAggregationHelper.AggregateDailyMetrics(successfulMetrics);
        var summary = BuildSummaryFromDailyMetrics(aggregatedMetrics);

        summary = await EnrichPlatformBreakdownAsync(profiles, workspaceId, summary, cancellationToken);

        await _cache.SetAsync(cacheKey, summary, TimeSpan.FromMinutes(60), cancellationToken);

        return Result.Success(summary);
    }

    public async Task<Result<HeatmapDto>> GetHeatmapAsync(
        Guid workspaceId,
        int date = 90,
        string? platform = null,
        string? profileId = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidPresets.Contains(date))
            date = 90;

        var platformSuffix = string.IsNullOrEmpty(platform) ? "all" : platform;
        var cacheKey = $"zernio:analytics:heatmap:{workspaceId}:{profileId ?? "default"}:{date}:{platformSuffix}";
        var cached = await _cache.GetAsync<HeatmapDto>(cacheKey, cancellationToken);
        if (cached != null)
        {
            _logger.LogInformation(
                "Cache hit for Zernio heatmap: {WorkspaceId}, days={Date}, platform={Platform}, profile={ProfileId}",
                workspaceId, date, platformSuffix, profileId ?? "default");
            return Result.Success(cached);
        }

        var profiles = await ResolveProfilesAsync(workspaceId, profileId);
        if (profiles.Count == 0)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return Result.Success(new HeatmapDto(Array.Empty<HeatmapSlotDto>()));
        }

        var bestTimeTasks = profiles.Select(p => SafeFetchBestTimeAsync(p.ZernioProfileId, platform, cancellationToken));
        var bestTimeResults = await Task.WhenAll(bestTimeTasks);
        var successfulBestTimes = bestTimeResults.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

        if (successfulBestTimes.Count == 0)
        {
            _logger.LogWarning("All profile best-time fetches failed for workspace {WorkspaceId}", workspaceId);

            var billingError = bestTimeResults.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
            if (billingError != null) throw billingError;
            var scopeError = bestTimeResults.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
            if (scopeError != null) throw scopeError;

            return Result.Success(new HeatmapDto(Array.Empty<HeatmapSlotDto>()));
        }

        var aggregatedBestTime = ZernioAggregationHelper.AggregateBestTime(successfulBestTimes);

        var slots = aggregatedBestTime.Slots
            .Select(s => new HeatmapSlotDto(
                DayOfWeek: s.DayOfWeek,
                Hour: s.Hour,
                Score: (int)Math.Round(s.AvgEngagement, MidpointRounding.AwayFromZero)))
            .ToList();

        var result = new HeatmapDto(slots);

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(60), cancellationToken);

        return Result.Success(result);
    }

    // ── Private helpers ─────────────────────────────────────────

    private async Task<IReadOnlyList<ZernioProfile>> ResolveProfilesAsync(Guid workspaceId, string? profileId)
    {
        var profiles = await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(workspaceId);

        if (profiles == null || profiles.Count == 0)
            return Array.Empty<ZernioProfile>();

        if (!string.IsNullOrEmpty(profileId))
        {
            if (Guid.TryParse(profileId, out var profileGuid))
            {
                return profiles.Where(p => p.Id == profileGuid || p.ZernioProfileId == profileId).ToList();
            }
            return profiles.Where(p => p.ZernioProfileId == profileId).ToList();
        }

        return profiles;
    }

    private sealed record SafeFetchResult<T>(T? Value, ZernioBillingRequiredException? BillingError, ZernioAnalyticsScopeException? ScopeError);

    private async Task<SafeFetchResult<ZernioDailyMetricsDto>> SafeFetchDailyMetricsAsync(
        string profileId, DateTime fromDate, DateTime toDate, CancellationToken ct)
    {
        try
        {
            var result = await _zernioClient.GetDailyMetricsAsync(profileId, fromDate, toDate, cancellationToken: ct);
            return new SafeFetchResult<ZernioDailyMetricsDto>(result, null, null);
        }
        catch (ZernioBillingRequiredException ex)
        {
            _logger.LogWarning(ex, "Billing gate for profile {ProfileId}", profileId);
            return new SafeFetchResult<ZernioDailyMetricsDto>(null, ex, null);
        }
        catch (ZernioAnalyticsScopeException ex)
        {
            _logger.LogWarning(ex, "Analytics scope missing for profile {ProfileId}", profileId);
            return new SafeFetchResult<ZernioDailyMetricsDto>(null, null, ex);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Transient error fetching daily metrics for profile {ProfileId}", profileId);
            return new SafeFetchResult<ZernioDailyMetricsDto>(null, null, null);
        }
    }

    private async Task<SafeFetchResult<ZernioBestTimeDto>> SafeFetchBestTimeAsync(
        string profileId, string? platform, CancellationToken ct)
    {
        try
        {
            var result = await _zernioClient.GetBestTimeAsync(profileId, platform, cancellationToken: ct);
            return new SafeFetchResult<ZernioBestTimeDto>(result, null, null);
        }
        catch (ZernioBillingRequiredException ex)
        {
            _logger.LogWarning(ex, "Billing gate for profile {ProfileId}", profileId);
            return new SafeFetchResult<ZernioBestTimeDto>(null, ex, null);
        }
        catch (ZernioAnalyticsScopeException ex)
        {
            _logger.LogWarning(ex, "Analytics scope missing for profile {ProfileId}", profileId);
            return new SafeFetchResult<ZernioBestTimeDto>(null, null, ex);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Transient error fetching best time for profile {ProfileId}", profileId);
            return new SafeFetchResult<ZernioBestTimeDto>(null, null, null);
        }
    }

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

    private async Task<WorkspaceAnalyticsSummaryDto> EnrichPlatformBreakdownAsync(
        IReadOnlyList<ZernioProfile> profiles,
        Guid workspaceId,
        WorkspaceAnalyticsSummaryDto summary,
        CancellationToken cancellationToken)
    {
        if (summary.PlatformBreakdown is null || summary.PlatformBreakdown.Count == 0)
            return summary;

        var allAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspaceId);
        var connectedAccounts = allAccounts
            .Where(sa => sa.IsActive && !string.IsNullOrEmpty(sa.ExternalAccountId))
            .ToList();

        if (connectedAccounts.Count == 0)
            return summary;

        var platformToProfile = connectedAccounts
            .GroupBy(sa => sa.Platform)
            .ToDictionary(g => g.Key, g =>
            {
                var account = g.First();
                return profiles.FirstOrDefault(p => p.Id == account.ZernioProfileId) ?? profiles[0];
            });

        var enriched = new List<PlatformBreakdownDto>();
        foreach (var pb in summary.PlatformBreakdown)
        {
            if (!platformToProfile.TryGetValue(pb.Platform, out var profile))
            {
                enriched.Add(pb);
                continue;
            }

            try
            {
                await _zernioClient.GetDailyMetricsAsync(
                    profileId: profile.ZernioProfileId, fromDate: DateTime.UtcNow.AddDays(-7), toDate: DateTime.UtcNow, cancellationToken: cancellationToken);

                enriched.Add(pb);
            }
            catch (ZernioAnalyticsScopeException ex)
            {
                _logger.LogWarning(ex, "Zernio analytics scope missing for platform {Platform} on profile {ProfileId}", pb.Platform, profile.ZernioProfileId);
                enriched.Add(pb with { RequiresReauth = true, ReauthorizeUrl = ex.ReauthorizeUrl });
            }
            catch (ZernioBillingRequiredException)
            {
                enriched.Add(pb);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Non-scope error checking platform scope for {Platform}", pb.Platform);
                enriched.Add(pb);
            }
        }

        return summary with { PlatformBreakdown = enriched };
    }
}
