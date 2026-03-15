namespace Syncra.Application.DTOs.Analytics;

public record WorkspaceAnalyticsSummaryDto(
    long TotalReach,
    double EngagementRate,
    long FollowerGrowth,
    int TotalPosts,
    IReadOnlyList<WeeklyReachDto> WeeklyReach
);

public record WeeklyReachDto(
    string WeekStart,   // "yyyy-MM-dd" của ngày đầu tuần
    long Reach
);
