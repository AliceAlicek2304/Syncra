namespace Syncra.Application.DTOs.Analytics;

public class AnalyticsOverviewDto
{
    public DateTime FromUtc { get; set; }
    public DateTime ToUtc { get; set; }
    public long TotalReach { get; set; }
    public long TotalEngagement { get; set; }
    public decimal EngagementRate { get; set; }
    public int TotalPosts { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
    public string? Source { get; set; }
}