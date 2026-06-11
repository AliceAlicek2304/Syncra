using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Common.Helpers;

public static class ZernioAggregationHelper
{
    public static ZernioDailyMetricsDto AggregateDailyMetrics(
        IReadOnlyList<ZernioDailyMetricsDto> metricsList)
    {
        if (metricsList.Count == 0)
            return new ZernioDailyMetricsDto(
                Array.Empty<ZernioDailyDataPointDto>(),
                Array.Empty<ZernioPlatformBreakdownDto>());

        if (metricsList.Count == 1)
            return metricsList[0];

        var dailyData = metricsList
            .SelectMany(m => m.DailyData)
            .GroupBy(d => d.Date)
            .Select(g =>
            {
                var platforms = g
                    .SelectMany(d => d.Platforms)
                    .GroupBy(p => p.Key)
                    .ToDictionary(p => p.Key, p => p.Sum(x => x.Value));

                return new ZernioDailyDataPointDto(
                    Date: g.Key,
                    PostCount: g.Sum(d => d.PostCount),
                    Platforms: platforms,
                    Metrics: new ZernioMetricsDto(
                        Impressions: g.Sum(d => d.Metrics.Impressions),
                        Reach: g.Sum(d => d.Metrics.Reach),
                        Likes: g.Sum(d => d.Metrics.Likes),
                        Comments: g.Sum(d => d.Metrics.Comments),
                        Shares: g.Sum(d => d.Metrics.Shares),
                        Saves: g.Sum(d => d.Metrics.Saves),
                        Clicks: g.Sum(d => d.Metrics.Clicks),
                        Views: g.Sum(d => d.Metrics.Views)));
            })
            .OrderBy(d => d.Date)
            .ToList();

        var platformBreakdown = metricsList
            .SelectMany(m => m.PlatformBreakdown)
            .GroupBy(p => p.Platform)
            .Select(g => new ZernioPlatformBreakdownDto(
                Platform: g.Key,
                PostCount: g.Sum(p => p.PostCount),
                Impressions: g.Sum(p => p.Impressions),
                Reach: g.Sum(p => p.Reach),
                Likes: g.Sum(p => p.Likes),
                Comments: g.Sum(p => p.Comments),
                Shares: g.Sum(p => p.Shares),
                Saves: g.Sum(p => p.Saves),
                Clicks: g.Sum(p => p.Clicks),
                Views: g.Sum(p => p.Views)))
            .ToList();

        return new ZernioDailyMetricsDto(dailyData, platformBreakdown);
    }

    public static ZernioPostingFrequencyResponseDto AggregatePostingFrequency(
        IReadOnlyList<ZernioPostingFrequencyResponseDto> frequencies)
    {
        if (frequencies.Count == 0)
            return new ZernioPostingFrequencyResponseDto(null);

        if (frequencies.Count == 1)
            return frequencies[0];

        var aggregated = frequencies
            .Where(f => f.Frequency is not null)
            .SelectMany(f => f.Frequency!)
            .GroupBy(f => f.Platform)
            .Select(g =>
            {
                var totalWeeks = g.Sum(f => f.WeeksCount);
                if (totalWeeks == 0)
                    return new ZernioPostingFrequencyItemDto(g.Key, 0, 0m, 0m, 0);

                return new ZernioPostingFrequencyItemDto(
                    Platform: g.Key,
                    PostsPerWeek: (int)Math.Round((double)g.Sum(f => f.PostsPerWeek * f.WeeksCount) / totalWeeks),
                    AvgEngagementRate: g.Sum(f => f.AvgEngagementRate * f.WeeksCount) / totalWeeks,
                    AvgEngagement: g.Sum(f => f.AvgEngagement * f.WeeksCount) / totalWeeks,
                    WeeksCount: totalWeeks);
            })
            .ToList();

        return new ZernioPostingFrequencyResponseDto(aggregated);
    }

    public static ZernioBestTimeDto AggregateBestTime(
        IReadOnlyList<ZernioBestTimeDto> bestTimes)
    {
        if (bestTimes.Count == 0)
            return new ZernioBestTimeDto(Array.Empty<ZernioBestTimeSlotDto>());

        if (bestTimes.Count == 1)
            return bestTimes[0];

        var slots = bestTimes
            .SelectMany(b => b.Slots)
            .GroupBy(s => (s.DayOfWeek, s.Hour))
            .Select(g =>
            {
                var totalPosts = g.Sum(s => s.PostCount);
                return new ZernioBestTimeSlotDto(
                    DayOfWeek: g.Key.DayOfWeek,
                    Hour: g.Key.Hour,
                    AvgEngagement: totalPosts > 0
                        ? g.Sum(s => s.AvgEngagement * s.PostCount) / totalPosts
                        : 0,
                    PostCount: totalPosts);
            })
            .OrderBy(s => s.DayOfWeek).ThenBy(s => s.Hour)
            .ToList();

        return new ZernioBestTimeDto(slots);
    }

    public static ZernioContentDecayResponseDto AggregateContentDecay(
        IReadOnlyList<ZernioContentDecayResponseDto> decays)
    {
        if (decays.Count == 0)
            return new ZernioContentDecayResponseDto(Array.Empty<ZernioContentDecayBucketDto>());

        if (decays.Count == 1)
            return decays[0];

        var buckets = decays
            .SelectMany(d => d.Buckets)
            .GroupBy(b => b.BucketOrder)
            .Select(g =>
            {
                var totalPosts = g.Sum(b => b.PostCount);
                var first = g.First();
                return new ZernioContentDecayBucketDto(
                    BucketOrder: g.Key,
                    BucketLabel: first.BucketLabel,
                    AvgPctOfFinal: totalPosts > 0
                        ? g.Sum(b => b.AvgPctOfFinal * b.PostCount) / totalPosts
                        : 0,
                    PostCount: totalPosts);
            })
            .OrderBy(b => b.BucketOrder)
            .ToList();

        return new ZernioContentDecayResponseDto(buckets);
    }

    public static ZernioFollowerStatsResponseDto AggregateFollowerStats(
        IReadOnlyList<ZernioFollowerStatsResponseDto> statsList)
    {
        if (statsList.Count == 0)
            return new ZernioFollowerStatsResponseDto(
                Array.Empty<ZernioFollowerStatsAccountDto>(), null, null, null);

        if (statsList.Count == 1)
            return statsList[0];

        var accounts = statsList
            .SelectMany(s => s.Accounts)
            .GroupBy(a => a.Id)
            .Select(g =>
            {
                var first = g.First();
                return new ZernioFollowerStatsAccountDto(
                    Id: g.Key,
                    Platform: first.Platform,
                    Username: first.Username,
                    DisplayName: first.DisplayName,
                    ProfilePicture: first.ProfilePicture,
                    CurrentFollowers: g.Sum(a => a.CurrentFollowers),
                    LastUpdated: g.Max(a => a.LastUpdated),
                    Growth: g.Sum(a => a.Growth),
                    GrowthPercentage: g.Average(a => a.GrowthPercentage),
                    DataPoints: g.Sum(a => a.DataPoints));
            })
            .ToList();

        IReadOnlyDictionary<string, IReadOnlyList<ZernioFollowerStatsDataPointDto>>? mergedStats = null;
        var nonNullStats = statsList.Where(s => s.Stats is not null).ToList();
        if (nonNullStats.Count > 0)
        {
            mergedStats = nonNullStats
                .SelectMany(s => s.Stats!)
                .GroupBy(kvp => kvp.Key)
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<ZernioFollowerStatsDataPointDto>)g
                        .SelectMany(kvp => kvp.Value)
                        .GroupBy(d => d.Date)
                        .Select(dg => new ZernioFollowerStatsDataPointDto(
                            Date: dg.Key,
                            Followers: dg.Sum(d => d.Followers)))
                        .OrderBy(d => d.Date)
                        .ToList());
        }

        var nonNullDateRanges = statsList
            .Where(s => s.DateRange is not null)
            .Select(s => s.DateRange!)
            .ToList();

        ZernioFollowerStatsDateRangeDto? dateRange = null;
        if (nonNullDateRanges.Count > 0)
        {
            dateRange = nonNullDateRanges.Aggregate((a, b) => new ZernioFollowerStatsDateRangeDto(
                From: a.From.HasValue && b.From.HasValue
                    ? (a.From.Value < b.From.Value ? a.From : b.From)
                    : (a.From ?? b.From),
                To: a.To.HasValue && b.To.HasValue
                    ? (a.To.Value > b.To.Value ? a.To : b.To)
                    : (a.To ?? b.To)));
        }

        return new ZernioFollowerStatsResponseDto(
            accounts, mergedStats, dateRange, statsList[0].Granularity ?? statsList.LastOrDefault()?.Granularity);
    }

    public static ZernioPostAnalyticsListDto AggregatePostAnalyticsList(
        IReadOnlyList<ZernioPostAnalyticsListDto> lists,
        string? sortBy = null,
        string? order = null,
        int? page = null,
        int? limit = null)
    {
        if (lists.Count == 0)
            return new ZernioPostAnalyticsListDto();

        if (lists.Count == 1)
            return lists[0];

        var nonNullLastSyncs = lists
            .Where(l => l.Overview?.LastSync is not null)
            .Select(l => l.Overview!.LastSync)
            .ToList();

        var overview = new ZernioAnalyticsOverviewDto(
            TotalPosts: lists.Sum(l => l.Overview?.TotalPosts ?? 0),
            PublishedPosts: lists.Sum(l => l.Overview?.PublishedPosts ?? 0),
            ScheduledPosts: lists.Sum(l => l.Overview?.ScheduledPosts ?? 0),
            LastSync: nonNullLastSyncs.Count > 0 ? nonNullLastSyncs.Max() : null,
            DataStaleness: lists
                .Select(l => l.Overview?.DataStaleness)
                .FirstOrDefault(ds => ds is not null));

        var allPosts = lists
            .Where(l => l.Posts is not null)
            .SelectMany(l => l.Posts!)
            .ToList();

        var allAccounts = lists
            .Where(l => l.Accounts is not null)
            .SelectMany(l => l.Accounts!)
            .GroupBy(a => a.Id)
            .Select(g => g.First())
            .ToList();

        var hasAnalyticsAccess = lists.Any(l => l.HasAnalyticsAccess == true);

        if (allPosts.Count == 0)
        {
            return new ZernioPostAnalyticsListDto(
                overview, Array.Empty<ZernioAnalyticsListPostDto>(),
                null, allAccounts, hasAnalyticsAccess);
        }

        var sorted = SortPosts(allPosts, sortBy, order);

        var totalPosts = sorted.Count;
        var resolvedPage = page ?? 1;
        var resolvedLimit = limit ?? totalPosts;
        var skip = (resolvedPage - 1) * resolvedLimit;
        var pagedPosts = sorted.Skip(skip).Take(resolvedLimit).ToList();

        var pagination = new ZernioAnalyticsPaginationDto(
            Page: resolvedPage,
            Limit: resolvedLimit,
            Total: totalPosts,
            Pages: (int)Math.Ceiling((double)totalPosts / resolvedLimit));

        return new ZernioPostAnalyticsListDto(
            overview, pagedPosts, pagination, allAccounts, hasAnalyticsAccess);
    }

    private static List<ZernioAnalyticsListPostDto> SortPosts(
        List<ZernioAnalyticsListPostDto> posts,
        string? sortBy,
        string? order)
    {
        var descending = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);

        var sorted = (sortBy?.ToLowerInvariant()) switch
        {
            "publishedat" => posts.OrderBy(p => p.PublishedAt),
            "scheduledfor" => posts.OrderBy(p => p.ScheduledFor),
            "status" => posts.OrderBy(p => p.Status),
            "impressions" => posts.OrderBy(p => p.Analytics?.Impressions ?? 0),
            "reach" => posts.OrderBy(p => p.Analytics?.Reach ?? 0),
            "likes" => posts.OrderBy(p => p.Analytics?.Likes ?? 0),
            "comments" => posts.OrderBy(p => p.Analytics?.Comments ?? 0),
            "shares" => posts.OrderBy(p => p.Analytics?.Shares ?? 0),
            "engagement" => posts.OrderBy(p =>
                p.Analytics?.Likes + p.Analytics?.Comments + p.Analytics?.Shares ?? 0),
            _ => posts.OrderBy(p => p.PublishedAt ?? p.ScheduledFor)
        };

        return descending ? sorted.Reverse().ToList() : sorted.ToList();
    }
}
