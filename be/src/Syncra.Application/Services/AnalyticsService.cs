using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;

namespace Syncra.Application.Services;

public class AnalyticsService : IAnalyticsService
{
    public Task<AnalyticsOverviewDto> GetOverviewAsync(Guid workspaceId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
    {
        var overview = new AnalyticsOverviewDto
        {
            FromUtc = fromUtc,
            ToUtc = toUtc,
            TotalReach = 12345,
            TotalEngagement = 678,
            EngagementRate = 5.5m,
            TotalPosts = 42,
            GeneratedAtUtc = DateTime.UtcNow,
            Source = "placeholder"
        };
        return Task.FromResult(overview);
    }

    public Task<IEnumerable<PlatformAnalyticsDto>> GetPlatformAnalyticsAsync(Guid workspaceId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
    {
        var platforms = new List<PlatformAnalyticsDto>
        {
            new() { Platform = "Twitter", Reach = 5000, Engagement = 300, PostCount = 20 },
            new() { Platform = "Facebook", Reach = 7345, Engagement = 378, PostCount = 22 }
        };
        return Task.FromResult<IEnumerable<PlatformAnalyticsDto>>(platforms);
    }

    public Task<IEnumerable<AnalyticsHeatmapDto>> GetHeatmapAsync(Guid workspaceId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
    {
        var heatmap = new List<AnalyticsHeatmapDto>();
        var random = new Random();
        for (var i = 0; i < 100; i++)
        {
            heatmap.Add(new AnalyticsHeatmapDto
            {
                Timestamp = fromUtc.AddDays(random.Next((toUtc - fromUtc).Days)),
                Value = random.Next(1, 50)
            });
        }
        return Task.FromResult<IEnumerable<AnalyticsHeatmapDto>>(heatmap);
    }
}