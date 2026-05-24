using Syncra.Application.DTOs.Trends;
using Syncra.Domain.Common;

namespace Syncra.Application.Interfaces;

/// <summary>
/// Service for retrieving trending topics and hashtags relevant to a workspace.
/// V1 returns curated/aggregated trends. Future versions will integrate with
/// external trend APIs (Zernio, ExplodingTopics, Google Trends).
/// </summary>
public interface ITrendsService
{
    /// <summary>
    /// Gets trending topics and hashtags for the workspace's connected platforms.
    /// </summary>
    Task<Result<TrendsResult>> GetTrendsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default);
}
