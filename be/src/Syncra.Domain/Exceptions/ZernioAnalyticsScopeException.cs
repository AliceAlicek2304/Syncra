namespace Syncra.Domain.Exceptions;

public sealed class ZernioAnalyticsScopeException : Exception
{
    public string Platform { get; }
    public string ReauthorizeUrl { get; }

    public ZernioAnalyticsScopeException(string platform, string message, string reauthorizeUrl)
        : base(message)
    {
        Platform = platform;
        ReauthorizeUrl = reauthorizeUrl;
    }
}
