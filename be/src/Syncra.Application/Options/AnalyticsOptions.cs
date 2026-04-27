using System;

namespace Syncra.Application.Options;

public class AnalyticsOptions
{
    public const string SectionName = "Analytics";
    
    public int CacheTtlSeconds { get; set; } = 3600;

    public TimeSpan CacheTtl
    {
        get
        {
            // Mitigation for T-02-03-01: Ensure reasonable minimum value
            var seconds = CacheTtlSeconds < 1 ? 1 : CacheTtlSeconds;
            return TimeSpan.FromSeconds(seconds);
        }
    }
}
