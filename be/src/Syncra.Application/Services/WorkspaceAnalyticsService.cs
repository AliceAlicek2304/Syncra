using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;

namespace Syncra.Application.Services;

/// <summary>Stub — implemented in Plan 01-02</summary>
public sealed class WorkspaceAnalyticsService : IWorkspaceAnalyticsService
{
    public Task<WorkspaceAnalyticsSummaryDto> GetSummaryAsync(
        Guid workspaceId, int date = 30, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();
}
