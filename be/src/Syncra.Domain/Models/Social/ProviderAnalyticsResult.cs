namespace Syncra.Domain.Models.Social;

public class ProviderAnalyticsResult
{
    public bool IsSuccess { get; set; }
    public string ProviderId { get; set; } = string.Empty;

    // Core metrics — normalized across providers
    public long? Views { get; set; }
    public long? Likes { get; set; }
    public long? Comments { get; set; }
    public long? Shares { get; set; }
    public long? Impressions { get; set; }
    public long? Reach { get; set; }
    public double? EngagementRate { get; set; }

    // YouTube regular video specific
    public double? WatchTimeMinutes { get; set; }
    public double? AverageViewDurationSeconds { get; set; }

    // YouTube Shorts specific
    /// <summary>True if this video is a YouTube Short.</summary>
    public bool? IsShort { get; set; }
    /// <summary>% of viewers who watched before swiping away — key Shorts retention metric.</summary>
    public double? AverageViewPercentage { get; set; }

    // LinkedIn-specific
    public long? Clicks { get; set; }
    public long? Reactions { get; set; }

    // Raw provider data (for debugging / future use)
    public Dictionary<string, object> RawMetrics { get; set; } = new();

    public ProviderError? Error { get; set; }

    public DateTime FetchedAtUtc { get; set; } = DateTime.UtcNow;
}
