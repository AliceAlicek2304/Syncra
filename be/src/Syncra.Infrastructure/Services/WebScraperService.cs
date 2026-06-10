using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure.Services;

public sealed partial class WebScraperService : IWebScraperService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<WebScraperService> _logger;

    private static readonly HashSet<string> BlockedHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "localhost", "127.0.0.1", "::1", "0.0.0.0",
        "metadata.google.internal", "100.100.100.200",
    };

    private static readonly (IPAddress Lower, IPAddress Upper)[] BlockedRanges =
    [
        // IPv4
        (IPAddress.Parse("127.0.0.0"), IPAddress.Parse("127.255.255.255")),
        (IPAddress.Parse("10.0.0.0"),   IPAddress.Parse("10.255.255.255")),
        (IPAddress.Parse("172.16.0.0"), IPAddress.Parse("172.31.255.255")),
        (IPAddress.Parse("192.168.0.0"),IPAddress.Parse("192.168.255.255")),
        (IPAddress.Parse("169.254.0.0"),IPAddress.Parse("169.254.255.255")),
        (IPAddress.Parse("100.64.0.0"), IPAddress.Parse("100.127.255.255")),
        (IPAddress.Parse("198.18.0.0"), IPAddress.Parse("198.19.255.255")),
        // IPv6
        (IPAddress.Parse("::1"),        IPAddress.Parse("::1")),
        (IPAddress.Parse("fc00::"),     IPAddress.Parse("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")),
        (IPAddress.Parse("fe80::"),     IPAddress.Parse("febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff")),
    ];

    public WebScraperService(IHttpClientFactory httpClientFactory, ILogger<WebScraperService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("WebScraper");
        _logger = logger;
    }

    public async Task<(string Title, string Content)> FetchUrlContentAsync(string url, CancellationToken ct = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new InvalidOperationException("Invalid URL format.");

        if (uri.Scheme != "http" && uri.Scheme != "https")
            throw new InvalidOperationException("Only http and https protocols are allowed.");

        if (BlockedHosts.Contains(uri.Host))
            throw new InvalidOperationException("Access to this host is not allowed.");

        var ipAddresses = await Dns.GetHostAddressesAsync(uri.Host, ct);
        foreach (var ip in ipAddresses)
        {
            if (IsPrivateOrLoopback(ip))
                throw new InvalidOperationException($"Access to IP address {ip} is not allowed.");
        }

        _logger.LogInformation("Fetching URL: {Url}", url);

        var response = await _httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var html = await response.Content.ReadAsStringAsync(ct);

        var title = ExtractTitle(html);
        var content = StripHtml(html);

        return (title, content);
    }

    private static bool IsPrivateOrLoopback(IPAddress ip)
    {
        // Handle IPv6 loopback separately
        if (ip.Equals(IPAddress.IPv6Loopback)) return true;

        // Map IPv4-mapped IPv6 to IPv4
        if (ip.AddressFamily == AddressFamily.InterNetworkV6 && ip.IsIPv4MappedToIPv6)
            ip = ip.MapToIPv4();

        var bytes = ip.GetAddressBytes();

        foreach (var (lower, upper) in BlockedRanges)
        {
            var lowerBytes = lower.GetAddressBytes();
            var upperBytes = upper.GetAddressBytes();

            if (bytes.Length != lowerBytes.Length) continue;

            var inRange = true;
            for (var i = 0; i < bytes.Length; i++)
            {
                if (bytes[i] < lowerBytes[i] || bytes[i] > upperBytes[i])
                {
                    inRange = false;
                    break;
                }
            }

            if (inRange) return true;
        }

        return false;
    }

    private static string ExtractTitle(string html)
    {
        var match = TitleRegex().Match(html);
        if (match.Success)
            return match.Groups[1].Value.Trim();

        match = OgTitleRegex().Match(html);
        return match.Success
            ? match.Groups[1].Value.Trim()
            : "Untitled";
    }

    private static string StripHtml(string html)
    {
        var text = ScriptStyleRegex().Replace(html, " ");
        text = HtmlTagRegex().Replace(text, " ");
        text = HtmlEntitiesRegex().Replace(text, " ");
        text = WhitespaceRegex().Replace(text, " ");
        return text.Trim();
    }

    [GeneratedRegex(@"<title[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleRegex();

    [GeneratedRegex(@"<meta\s+[^>]*property=[""']og:title[""'][^>]*content=[""']([^""']*)[""']", RegexOptions.IgnoreCase)]
    private static partial Regex OgTitleRegex();

    [GeneratedRegex(@"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex ScriptStyleRegex();

    [GeneratedRegex(@"<[^>]+>", RegexOptions.IgnoreCase)]
    private static partial Regex HtmlTagRegex();

    [GeneratedRegex(@"&[a-zA-Z]+;|&#\d+;", RegexOptions.IgnoreCase)]
    private static partial Regex HtmlEntitiesRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
