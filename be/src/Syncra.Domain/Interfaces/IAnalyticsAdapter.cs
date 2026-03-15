using Syncra.Domain.Models.Social;

namespace Syncra.Domain.Interfaces;

public interface IAnalyticsAdapter
{
    string ProviderId { get; }

    /// <summary>
    /// Fetch aggregate analytics for the channel/page. Matches Potiz analytics().
    /// </summary>
    Task<List<AnalyticsData>> GetAnalyticsAsync(
        string id,
        string accessToken,
        int date,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetch analytics for a specific post. Matches Potiz postAnalytics().
    /// </summary>
    Task<List<AnalyticsData>> GetPostAnalyticsAsync(
        string integrationId,
        string accessToken,
        string postId,
        int date,
        CancellationToken cancellationToken = default);
}
