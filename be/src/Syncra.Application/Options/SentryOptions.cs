namespace Syncra.Application.Options;

public class SentryOptions
{
    public const string SectionName = "Sentry";
    public string Dsn { get; set; } = string.Empty;
    public string Environment { get; set; } = "development";
    public double TracesSampleRate { get; set; } = 1.0;
    public bool EnableTracing { get; set; } = true;
}
