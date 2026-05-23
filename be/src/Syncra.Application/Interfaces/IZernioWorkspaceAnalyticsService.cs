using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Common;

namespace Syncra.Application.Interfaces;

public interface IZernioWorkspaceAnalyticsService
{
    Task<Result<WorkspaceAnalyticsSummaryDto>> GetSummaryAsync(
        Guid workspaceId,
        int date = 30,
        CancellationToken cancellationToken = default);

    Task<Result<PostMetricsDto>> GetPostMetricsAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default);
}
