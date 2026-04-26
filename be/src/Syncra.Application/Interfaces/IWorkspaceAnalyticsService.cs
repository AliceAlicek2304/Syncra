using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Common;

namespace Syncra.Application.Interfaces;

public interface IWorkspaceAnalyticsService
{
    Task<Result<WorkspaceAnalyticsSummaryDto>> GetSummaryAsync(
        Guid workspaceId,
        int date = 30,
        CancellationToken cancellationToken = default);

    Task<Result<HeatmapDto>> GetHeatmapAsync(
        Guid workspaceId,
        int date = 90,
        CancellationToken cancellationToken = default);
}
