namespace Syncra.Domain.Models.Social;

/// <summary>
/// Potiz-compatible analytics contract. Matches AnalyticsData in social.integrations.interface.ts.
/// </summary>
public class AnalyticsData
{
    public string Label { get; set; } = string.Empty;
    public List<AnalyticsDataPoint> Data { get; set; } = new();
    public double PercentageChange { get; set; }
}

public class AnalyticsDataPoint
{
    public string Total { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
}
