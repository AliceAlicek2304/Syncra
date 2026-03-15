using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Domain.Enums;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Services;

public sealed class WorkspaceAnalyticsService : IWorkspaceAnalyticsService
{
    // Cache ICT timezone for performance
    private static readonly TimeZoneInfo IctZone = TryGetIctTimeZone();

    private readonly IIntegrationRepository _integrationRepository;
    private readonly IPostRepository _postRepository;
    private readonly IIntegrationAnalyticsService _integrationAnalyticsService;
    private readonly ILogger<WorkspaceAnalyticsService> _logger;

    public WorkspaceAnalyticsService(
        IIntegrationRepository integrationRepository,
        IPostRepository postRepository,
        IIntegrationAnalyticsService integrationAnalyticsService,
        ILogger<WorkspaceAnalyticsService> logger)
    {
        _integrationRepository = integrationRepository;
        _postRepository = postRepository;
        _integrationAnalyticsService = integrationAnalyticsService;
        _logger = logger;
    }

    public async Task<WorkspaceAnalyticsSummaryDto> GetSummaryAsync(
        Guid workspaceId,
        int date = 30,
        CancellationToken cancellationToken = default)
    {
        // 1. Lấy tất cả active integrations
        var integrations = (await _integrationRepository.GetByWorkspaceIdAsync(workspaceId))
            .Where(i => i.IsActive)
            .ToList();

        if (!integrations.Any())
        {
            _logger.LogInformation("No active integrations found for workspace {WorkspaceId}", workspaceId);
            return new WorkspaceAnalyticsSummaryDto(
                TotalReach: 0,
                EngagementRate: 0,
                FollowerGrowth: 0,
                TotalPosts: 0,
                WeeklyReach: Array.Empty<WeeklyReachDto>());
        }

        // 2. Gọi analytics song song cho từng integration
        var analyticsResults = await Task.WhenAll(
            integrations.Select(i =>
                _integrationAnalyticsService.CheckAnalyticsAsync(workspaceId, i.Id, date, cancellationToken)
                    .ContinueWith(t => t.IsCompletedSuccessfully ? t.Result : new List<AnalyticsData>(),
                        TaskContinuationOptions.None)));

        // 3. Aggregate
        var allData = analyticsResults.SelectMany(r => r).ToList();

        var totalReach = SumLabel(allData, "Page Impressions", "Views");
        var totalEngagements = SumLabel(allData, "Posts Engagement", "Likes", "Comments", "Shares");
        var followerGrowth = SumLabel(allData, "Page followers");

        var engagementRate = totalReach > 0
            ? Math.Round((double)totalEngagements / totalReach * 100, 2)
            : 0;

        // 4. Total posts từ DB
        var posts = await _postRepository.GetByWorkspaceIdAsync(workspaceId);
        var totalPosts = posts.Count(p =>
            p.Status == PostStatus.Published ||
            p.Status == PostStatus.Scheduled);

        // 5. Weekly reach — aggregate Page Impressions + Views theo tuần
        var weeklyReach = BuildWeeklyReach(allData, date);

        return new WorkspaceAnalyticsSummaryDto(
            TotalReach: totalReach,
            EngagementRate: engagementRate,
            FollowerGrowth: followerGrowth,
            TotalPosts: totalPosts,
            WeeklyReach: weeklyReach);
    }

    // Cộng tổng tất cả data points của các labels chỉ định
    private static long SumLabel(List<AnalyticsData> data, params string[] labels)
    {
        return data
            .Where(d => labels.Contains(d.Label))
            .SelectMany(d => d.Data)
            .Sum(p => long.TryParse(p.Total, out var v) ? v : 0);
    }

    // Group by tuần, cộng reach
    private static IReadOnlyList<WeeklyReachDto> BuildWeeklyReach(List<AnalyticsData> data, int date)
    {
        var reachData = data
            .Where(d => d.Label == "Page Impressions" || d.Label == "Views")
            .SelectMany(d => d.Data);

        var grouped = reachData
            .Where(p => DateOnly.TryParse(p.Date, out _))
            .GroupBy(p =>
            {
                var d = DateOnly.Parse(p.Date);
                // Ngày đầu tuần (Monday)
                var dow = (int)d.DayOfWeek;
                var monday = d.AddDays(-(dow == 0 ? 6 : dow - 1));
                return monday;
            })
            .OrderBy(g => g.Key)
            .Select(g => new WeeklyReachDto(
                WeekStart: g.Key.ToString("yyyy-MM-dd"),
                Reach: g.Sum(p => long.TryParse(p.Total, out var v) ? v : 0)))
            .ToList();

        return grouped;
    }

    public async Task<HeatmapDto> GetHeatmapAsync(
        Guid workspaceId,
        int date = 90,
        CancellationToken cancellationToken = default)
    {
        var since = DateTime.UtcNow.AddDays(-date);

        var posts = await _postRepository.GetByWorkspaceIdAsync(workspaceId);

        // Chỉ lấy published posts trong khoảng thời gian
        var publishedPosts = posts
            .Where(p => p.Status == PostStatus.Published
                     && p.PublishedAtUtc.HasValue
                     && p.PublishedAtUtc.Value >= since)
            .ToList();

        // Group by DayOfWeek × Hour in ICT timezone (Vietnam - GMT+7)
        // DayOfWeek: Monday=0 ... Sunday=6 (ISO week)
        var grouped = publishedPosts
            .GroupBy(p =>
            {
                // Convert from UTC to ICT (GMT+7)
                var utcDt = p.PublishedAtUtc!.Value;
                var ictDt = TimeZoneInfo.ConvertTimeFromUtc(utcDt, IctZone);
                var dow = ictDt.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)ictDt.DayOfWeek - 1;
                return (DayOfWeek: dow, Hour: ictDt.Hour);
            })
            .Select(g => new HeatmapSlotDto(
                DayOfWeek: g.Key.DayOfWeek,
                Hour: g.Key.Hour,
                Score: g.Count()))
            .ToList();

        return new HeatmapDto(Slots: grouped);
    }

    // Try to get ICT timezone, with fallback for different OS
    private static TimeZoneInfo TryGetIctTimeZone()
    {
        // Try Windows timezone name
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            if (tz != null) return tz;
        }
        catch { }

        // Try IANA timezone name (Linux/macOS)
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
            if (tz != null) return tz;
        }
        catch { }

        // Fallback: create custom timezone (GMT+7)
        return TimeZoneInfo.CreateCustomTimeZone("ICT", TimeSpan.FromHours(7), "ICT", "Indochina Time");
    }
}
