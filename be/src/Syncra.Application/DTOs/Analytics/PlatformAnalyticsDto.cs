namespace Syncra.Application.DTOs.Analytics;

public class PlatformAnalyticsDto
{
    public string? Platform { get; set; }
    public long Reach { get; set; }
    public long Engagement { get; set; }
    public int PostCount { get; set; }
}