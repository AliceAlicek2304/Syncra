using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.DTOs.Analytics;

public record WorkspaceAnalyticsSummaryDto(
    long TotalReach,
    double EngagementRate,
    long FollowerGrowth,
    int TotalPosts,
    IReadOnlyList<WeeklyReachDto> WeeklyReach,
    IReadOnlyList<PlatformBreakdownDto>? PlatformBreakdown = null
);

public record WeeklyReachDto(
    string WeekStart,   // "yyyy-MM-dd" của ngày đầu tuần
    long Reach
);

/// <summary>
/// Matrix 7 ngày × 24 giờ. DayOfWeek: 0=Monday ... 6=Sunday.
/// Score = số posts published tại slot đó (proxy cho engagement).
/// </summary>
public record HeatmapDto(
    IReadOnlyList<HeatmapSlotDto> Slots
);

public record HeatmapSlotDto(
    int DayOfWeek,   // 0=Monday, 6=Sunday
    int Hour,        // 0-23 UTC
    int Score        // số posts published tại slot này
);

public record PlatformBreakdownDto(
    string Platform,
    int PostCount,
    int Impressions,
    int Reach,
    int Likes,
    int Comments,
    int Shares,
    int Saves,
    int Clicks,
    int Views,
    bool RequiresReauth = false,
    string? ReauthorizeUrl = null);
