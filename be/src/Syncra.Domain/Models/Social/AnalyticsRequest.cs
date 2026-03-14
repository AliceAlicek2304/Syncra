namespace Syncra.Domain.Models.Social;

public class AnalyticsRequest
{
    /// <summary>External ID of the post/video (from PublishResult.ExternalId).</summary>
    public string? ExternalId { get; set; }

    /// <summary>Channel/Page/Profile ID (from Integration.Metadata["channelId"]).</summary>
    public string? AccountId { get; set; }

    public DateTime StartDateUtc { get; set; } = DateTime.UtcNow.AddDays(-28);
    public DateTime EndDateUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// YouTube: true if the video is a Short (from PublishResult.Metadata["isShort"]).
    /// Affects which metrics set is requested — Shorts use averageViewPercentage instead of estimatedMinutesWatched.
    /// </summary>
    public bool? IsShort { get; set; }
}
