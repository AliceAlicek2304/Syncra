using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.DTOs.Analytics;

public sealed record PostMetricsDto(
    int Impressions,
    int Engagements,    // Likes + Comments + Shares
    int Clicks,
    int Views,
    decimal EngagementRate,
    IReadOnlyList<ZernioPlatformPostMetricsDto>? PlatformAnalytics);
