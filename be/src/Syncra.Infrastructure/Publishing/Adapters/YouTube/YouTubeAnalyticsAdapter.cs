using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing.Adapters.YouTube;

public sealed class YouTubeAnalyticsAdapter : IAnalyticsAdapter
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<YouTubeAnalyticsAdapter> _logger;

    private const string AnalyticsBaseUrl = "https://youtubeanalytics.googleapis.com/v2/reports";

    public YouTubeAnalyticsAdapter(HttpClient httpClient, ILogger<YouTubeAnalyticsAdapter> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public string ProviderId => "youtube";

    /// <summary>
    /// Matches Potiz analytics() contract — returns AnalyticsData[] with label/data/percentageChange.
    /// </summary>
    public async Task<List<AnalyticsData>> GetAnalyticsAsync(
        string id,
        string accessToken,
        int date,
        CancellationToken cancellationToken = default)
    {
        var endDate = DateTime.UtcNow;
        var startDate = endDate.AddDays(-date);

        var url = BuildUrl(new Dictionary<string, string>
        {
            ["ids"] = "channel==MINE",
            ["metrics"] = "views,likes,comments,shares,estimatedMinutesWatched,subscribersGained",
            ["startDate"] = startDate.ToString("yyyy-MM-dd"),
            ["endDate"] = endDate.ToString("yyyy-MM-dd")
        });

        var (json, failed) = await FetchAsync(accessToken, url, cancellationToken);
        if (failed || json == null) return new List<AnalyticsData>();

        var (views, likes, comments, _) = ParseMetrics(json);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var result = new List<AnalyticsData>();
        if (views.HasValue)
            result.Add(MakeItem("Views", views.Value, today));
        if (likes.HasValue)
            result.Add(MakeItem("Likes", likes.Value, today));
        if (comments.HasValue)
            result.Add(MakeItem("Comments", comments.Value, today));

        return result;
    }

    /// <summary>
    /// Matches Potiz postAnalytics() contract — returns AnalyticsData[] with label/data/percentageChange.
    /// </summary>
    public async Task<List<AnalyticsData>> GetPostAnalyticsAsync(
        string integrationId,
        string accessToken,
        string postId,
        int date,
        CancellationToken cancellationToken = default)
    {
        var endDate = DateTime.UtcNow;
        var startDate = endDate.AddDays(-date);

        var url = BuildUrl(new Dictionary<string, string>
        {
            ["ids"] = "channel==MINE",
            ["metrics"] = "views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration",
            ["dimensions"] = "video",
            ["filters"] = $"video=={postId}",
            ["startDate"] = startDate.ToString("yyyy-MM-dd"),
            ["endDate"] = endDate.ToString("yyyy-MM-dd")
        });

        var (json, failed) = await FetchAsync(accessToken, url, cancellationToken);
        if (failed || json == null) return new List<AnalyticsData>();

        var (views, likes, comments, _) = ParseMetrics(json);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var result = new List<AnalyticsData>();
        if (views.HasValue)
            result.Add(MakeItem("Views", views.Value, today));
        if (likes.HasValue)
            result.Add(MakeItem("Likes", likes.Value, today));
        if (comments.HasValue)
            result.Add(MakeItem("Comments", comments.Value, today));

        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static AnalyticsData MakeItem(string label, long value, string date) =>
        new()
        {
            Label = label,
            PercentageChange = 0,
            Data = new List<AnalyticsDataPoint> { new() { Total = value.ToString(), Date = date } }
        };

    /// <summary>
    /// Parses YouTube Analytics API v2 report response.
    /// Maps column headers dynamically — never hardcodes column index.
    /// Returns (views, likes, comments, shares). Null = not present in response.
    /// </summary>
    private static (long? views, long? likes, long? comments, long? shares) ParseMetrics(JsonNode json)
    {
        var headers = json["columnHeaders"]?.AsArray();
        var rows = json["rows"]?.AsArray();

        if (headers == null || rows == null || rows.Count == 0)
            return (null, null, null, null);

        var colIndex = BuildColumnIndex(headers);
        var row = rows[0]!.AsArray();

        return (
            GetLong(colIndex, row, "views"),
            GetLong(colIndex, row, "likes"),
            GetLong(colIndex, row, "comments"),
            GetLong(colIndex, row, "shares")
        );
    }

    private async Task<(JsonNode? json, bool failed)> FetchAsync(
        string accessToken,
        string url,
        CancellationToken cancellationToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[YouTubeAnalytics] HTTP {StatusCode}: {Body}",
                    (int)response.StatusCode, body.Length > 300 ? body[..300] : body);
                return (null, true);
            }

            JsonNode? json = null;
            try { json = JsonSerializer.Deserialize<JsonNode>(body); }
            catch { /* ignore parse errors */ }

            return (json, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[YouTubeAnalytics] Exception fetching.");
            return (null, true);
        }
    }

    private static Dictionary<string, int> BuildColumnIndex(JsonArray headers)
    {
        var index = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < headers.Count; i++)
        {
            var name = headers[i]?["name"]?.ToString();
            if (!string.IsNullOrEmpty(name))
                index[name] = i;
        }
        return index;
    }

    private static long? GetLong(Dictionary<string, int> colIndex, JsonArray row, string column)
    {
        if (!colIndex.TryGetValue(column, out var idx)) return null;
        var val = row[idx]?.ToString();
        return long.TryParse(val, out var result) ? result : null;
    }

    private static string BuildUrl(Dictionary<string, string> parameters)
    {
        var query = string.Join("&", parameters.Select(kv =>
            $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        return $"{AnalyticsBaseUrl}?{query}";
    }
}
