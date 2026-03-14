using Syncra.Application.DTOs.Analytics;

namespace Syncra.Application.Interfaces;

public interface IAnalyticsService
{
    Task<AnalyticsOverviewDto> GetOverviewAsync(Guid workspaceId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);
    Task<IEnumerable<PlatformAnalyticsDto>> GetPlatformAnalyticsAsync(Guid workspaceId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);
    Task<IEnumerable<AnalyticsHeatmapDto>> GetHeatmapAsync(Guid workspaceId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);
}