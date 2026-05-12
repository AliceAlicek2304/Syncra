using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;
using System.Text;

namespace Syncra.Application.Services;

public sealed class AnalyticsExportService : IAnalyticsExportService
{
    private readonly IWorkspaceAnalyticsService _analyticsService;
    private readonly IPostRepository _postRepository;
    private readonly ILogger<AnalyticsExportService> _logger;

    public AnalyticsExportService(
        IWorkspaceAnalyticsService analyticsService,
        IPostRepository postRepository,
        ILogger<AnalyticsExportService> logger)
    {
        _analyticsService = analyticsService;
        _postRepository = postRepository;
        _logger = logger;
    }

    public async Task<Result<byte[]>> ExportCsvAsync(
        Guid workspaceId,
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken cancellationToken = default)
    {
        var days = (int)Math.Ceiling((endUtc - startUtc).TotalDays);
        if (days < 1) days = 1;

        var summaryResult = await _analyticsService.GetSummaryAsync(workspaceId, days, cancellationToken);
        if (summaryResult.IsFailure)
        {
            _logger.LogError("Failed to fetch analytics summary: {Error}", summaryResult.Error);
            return Result.Failure<byte[]>(summaryResult.Error!);
        }

        var heatmapResult = await _analyticsService.GetHeatmapAsync(workspaceId, days, cancellationToken);
        if (heatmapResult.IsFailure)
        {
            _logger.LogError("Failed to fetch heatmap: {Error}", heatmapResult.Error);
            return Result.Failure<byte[]>(heatmapResult.Error!);
        }

        var posts = await _postRepository.GetPublishedPostsForExportAsync(workspaceId, startUtc, endUtc, cancellationToken);

        var summary = summaryResult.Value;
        var heatmap = heatmapResult.Value;

        var sb = new StringBuilder();
        sb.AppendLine("# Analytics Export - Syncra.NET");
        sb.AppendLine($"# Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
        sb.AppendLine($"# Date Range: {startUtc:yyyy-MM-dd} to {endUtc:yyyy-MM-dd}");
        sb.AppendLine($"# Workspace: {workspaceId}");
        sb.AppendLine();
        sb.AppendLine("=== SUMMARY ===");
        sb.AppendLine("Metric,Value");
        sb.AppendLine($"Total Reach,{summary.TotalReach}");
        sb.AppendLine($"Engagement Rate (%),{summary.EngagementRate}");
        sb.AppendLine($"Follower Growth,{summary.FollowerGrowth}");
        sb.AppendLine($"Total Posts,{summary.TotalPosts}");
        sb.AppendLine();

        if (summary.WeeklyReach.Count > 0)
        {
            sb.AppendLine("Weekly Reach");
            sb.AppendLine("Week Start,Reach");
            foreach (var week in summary.WeeklyReach)
            {
                sb.AppendLine($"{week.WeekStart},{week.Reach}");
            }
            sb.AppendLine();
        }

        sb.AppendLine("=== HEATMAP ===");
        sb.AppendLine("Day Of Week,Hour,Score");
        foreach (var slot in heatmap.Slots)
        {
            sb.AppendLine($"{slot.DayOfWeek},{slot.Hour},{slot.Score}");
        }
        sb.AppendLine();

        sb.AppendLine("=== POSTS ===");
        sb.AppendLine("ID,Title Preview,Content Preview,Published At (UTC),Platform,Status");
        foreach (var post in posts)
        {
            sb.AppendLine(string.Join(",",
                post.Id,
                CsvEscape(post.TitlePreview),
                CsvEscape(post.ContentPreview),
                post.PublishedAtUtc.ToString("yyyy-MM-dd HH:mm:ss"),
                post.Platform,
                post.Status));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return Result.Success(bytes);
    }

    private static string CsvEscape(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return "";

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
