using System.Threading;
using System.Threading.Tasks;
using Syncra.Domain.Models.Social;

namespace Syncra.Domain.Interfaces;

public interface IAnalyticsAdapter
{
    string ProviderId { get; }

    /// <summary>
    /// Fetch analytics for a specific post/video by externalId.
    /// </summary>
    Task<ProviderAnalyticsResult> GetPostAnalyticsAsync(
        string accessToken,
        AnalyticsRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetch aggregate analytics for the entire channel/page/profile.
    /// </summary>
    Task<ProviderAnalyticsResult> GetAccountAnalyticsAsync(
        string accessToken,
        AnalyticsRequest request,
        CancellationToken cancellationToken = default);
}
