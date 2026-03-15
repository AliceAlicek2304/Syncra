using Syncra.Domain.Models.Social;

namespace Syncra.Application.Interfaces;

/// <summary>
/// Matches Potiz IntegrationService.checkAnalytics() — handles cache, token refresh, and provider call.
/// </summary>
public interface IIntegrationAnalyticsService
{
    Task<List<AnalyticsData>> CheckAnalyticsAsync(
        Guid workspaceId,
        Guid integrationId,
        int date,
        CancellationToken cancellationToken = default);

    Task<List<AnalyticsData>> CheckPostAnalyticsAsync(
        Guid workspaceId,
        Guid postId,
        int date,
        CancellationToken cancellationToken = default);
}
