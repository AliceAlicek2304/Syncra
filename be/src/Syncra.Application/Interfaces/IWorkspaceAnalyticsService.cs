using Syncra.Application.DTOs.Analytics;

namespace Syncra.Application.Interfaces;

public interface IWorkspaceAnalyticsService
{
    Task<WorkspaceAnalyticsSummaryDto> GetSummaryAsync(
        Guid workspaceId,
        int date = 30,
        CancellationToken cancellationToken = default);
}
