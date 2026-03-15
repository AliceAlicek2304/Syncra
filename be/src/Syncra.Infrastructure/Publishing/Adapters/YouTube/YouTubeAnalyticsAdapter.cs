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

        var (json, error) = await FetchAsync(accessToken, url, cancellationToken);
        if (error != null) return new List<AnalyticsData>();

        var result = ParseReportResponse(json!, ProviderId);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var analyticsData = new List<AnalyticsData>();
        if (result.Views.HasValue)
            analyticsData.Add(new AnalyticsData { Label = "Views", PercentageChange = 0, Data = new List<AnalyticsDataPoint> { new() { Total = result.Views.Value.ToString(), Date = today } } });
        if (result.Likes.HasValue)
            analyticsData.Add(new AnalyticsData { Label = "Likes", PercentageChange = 0, Data = new List<AnalyticsDataPoint> { new() { Total = result.Likes.Value.ToString(), Date = today } } });
        if (result.Comments.HasValue)
            analyticsData.Add(new AnalyticsData { Label = "Comments", PercentageChange = 0, Data = new List<AnalyticsDataPoint> { new() { Total = result.Comments.Value.ToString(), Date = today } } });

        return analyticsData;
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

        var (json, error) = await FetchAsync(accessToken, url, cancellationToken);
        if (error != null) return new List<AnalyticsData>();

        var result = ParseReportResponse(json!, ProviderId);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var analyticsData = new List<AnalyticsData>();
        if (result.Views.HasValue)
            analyticsData.Add(new AnalyticsData { Label = "Views", PercentageChange = 0, Data = new List<AnalyticsDataPoint> { new() { Total = result.Views.Value.ToString(), Date = today } } });
        if (result.Likes.HasValue)
            analyticsData.Add(new AnalyticsData { Label = "Likes", PercentageChange = 0, Data = new List<AnalyticsDataPoint> { new() { Total = result.Likes.Value.ToString(), Date = today } } });
        if (result.Comments.HasValue)
            analyticsData.Add(new AnalyticsData { Label = "Comments", PercentageChange = 0, Data = new List<AnalyticsDataPoint> { new() { Total = result.Comments.Value.ToString(), Date = today } } });

        return analyticsData;
    }

    public async Task<ProviderAnalyticsResult> GetPostAnalyticsLegacyAsync(
        string accessToken,
        AnalyticsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.ExternalId))
        {
            return ErrorResult("missing_external_id", "ExternalId (videoId) is required for post analytics.");
        }

        var isShort = request.IsShort == true;

        // Shorts omit estimatedMinutesWatched (not meaningful for <60s videos)
        var metrics = isShort
            ? "views,likes,comments,shares,averageViewPercentage,subscribersGained"
            : "views,likes,dislikes,comments,shares,estimatedMinutesWatched,averageViewDuration,averageViewPercentage";

        var url = BuildUrl(new Dictionary<string, string>
        {
            ["ids"] = "channel==MINE",
            ["metrics"] = metrics,
            ["dimensions"] = "video",
            ["filters"] = $"video=={request.ExternalId}",
            ["startDate"] = request.StartDateUtc.ToString("yyyy-MM-dd"),
            ["endDate"] = request.EndDateUtc.ToString("yyyy-MM-dd")
        });

        var (json, error) = await FetchAsync(accessToken, url, cancellationToken);
        if (error != null) return error;

        var result = ParseReportResponse(json!, ProviderId);
        result.IsShort = isShort;

        if (!isShort)
        {
            result.WatchTimeMinutes = GetDouble(result.RawMetrics, "estimatedMinutesWatched");
            result.AverageViewDurationSeconds = GetDouble(result.RawMetrics, "averageViewDuration");
        }

        result.AverageViewPercentage = GetDouble(result.RawMetrics, "averageViewPercentage");

        return result;
    }

    public async Task<ProviderAnalyticsResult> GetAccountAnalyticsAsync(
        string accessToken,
        AnalyticsRequest request,
        CancellationToken cancellationToken = default)
    {
        var url = BuildUrl(new Dictionary<string, string>
        {
            ["ids"] = "channel==MINE",
            ["metrics"] = "views,likes,comments,shares,estimatedMinutesWatched,subscribersGained",
            ["startDate"] = request.StartDateUtc.ToString("yyyy-MM-dd"),
            ["endDate"] = request.EndDateUtc.ToString("yyyy-MM-dd")
        });

        var (json, error) = await FetchAsync(accessToken, url, cancellationToken);
        if (error != null) return error;

        var result = ParseReportResponse(json!, ProviderId);
        result.WatchTimeMinutes = GetDouble(result.RawMetrics, "estimatedMinutesWatched");

        return result;
    }

    private async Task<(JsonNode? json, ProviderAnalyticsResult? error)> FetchAsync(
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
                return (null, MapHttpError(response.StatusCode, body));
            }

            JsonNode? json = null;
            try { json = JsonSerializer.Deserialize<JsonNode>(body); }
            catch { /* ignore parse errors */ }

            return (json, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception fetching YouTube Analytics.");
            return (null, ErrorResult("internal_error", ex.Message, isTransient: true));
        }
    }

    /// <summary>
    /// Parses YouTube Analytics API v2 report response.
    /// Maps column headers dynamically — never hardcodes column index.
    /// Empty rows (data not yet available) returns IsSuccess=true with null metrics.
    /// </summary>
    private static ProviderAnalyticsResult ParseReportResponse(JsonNode json, string providerId)
    {
        var result = new ProviderAnalyticsResult { IsSuccess = true, ProviderId = providerId };

        var headers = json["columnHeaders"]?.AsArray();
        var rows = json["rows"]?.AsArray();

        if (headers == null || rows == null || rows.Count == 0)
        {
            // Data not yet available — not an error
            return result;
        }

        var colIndex = BuildColumnIndex(headers);
        var row = rows[0]!.AsArray();

        // Populate RawMetrics for all columns
        foreach (var (name, idx) in colIndex)
        {
            var val = row[idx];
            if (val != null)
                result.RawMetrics[name] = val.ToString() ?? string.Empty;
        }

        // Map normalized fields
        result.Views = GetLong(colIndex, row, "views");
        result.Likes = GetLong(colIndex, row, "likes");
        result.Comments = GetLong(colIndex, row, "comments");
        result.Shares = GetLong(colIndex, row, "shares");

        return result;
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

    private static double? GetDouble(Dictionary<string, object> rawMetrics, string key)
    {
        if (!rawMetrics.TryGetValue(key, out var val)) return null;
        return double.TryParse(val?.ToString(), System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
    }

    private static string BuildUrl(Dictionary<string, string> parameters)
    {
        var query = string.Join("&", parameters.Select(kv =>
            $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        return $"{AnalyticsBaseUrl}?{query}";
    }

    private ProviderAnalyticsResult MapHttpError(System.Net.HttpStatusCode statusCode, string body)
    {
        _logger.LogWarning("YouTube Analytics API returned {StatusCode}: {Body}", (int)statusCode, body);

        if ((int)statusCode == 401)
            return ErrorResult("unauthorized", "Access token expired or invalid.");

        if ((int)statusCode == 403)
        {
            // Check for analytics-specific reason
            if (body.Contains("youtubeAnalyticsDataNotAvailable", StringComparison.OrdinalIgnoreCase))
                return ErrorResult("analytics_not_available",
                    "Analytics data not yet available. YouTube has ~24-48h delay.");

            // Distinguish quota exhaustion from missing scopes
            if (body.Contains("quotaExceeded", StringComparison.OrdinalIgnoreCase))
                return ErrorResult("quota_exceeded", "YouTube API daily quota (10,000 units) exhausted. Try again tomorrow.");

            if (body.Contains("forbidden", StringComparison.OrdinalIgnoreCase) ||
                body.Contains("insufficientPermissions", StringComparison.OrdinalIgnoreCase) ||
                body.Contains("ACCESS_TOKEN_SCOPE_INSUFFICIENT", StringComparison.OrdinalIgnoreCase))
                return ErrorResult("insufficient_permissions",
                    "OAuth token missing required scope. Re-authorize with yt-analytics.readonly scope.");

            return ErrorResult("quota_exceeded",
                "YouTube API quota exceeded or insufficient permissions.");
        }

        return ErrorResult($"youtube_error_{(int)statusCode}", $"YouTube Analytics API returned {(int)statusCode}.",
            isTransient: statusCode >= System.Net.HttpStatusCode.InternalServerError);
    }

    private static ProviderAnalyticsResult ErrorResult(string code, string message, bool isTransient = false) =>
        new()
        {
            IsSuccess = false,
            ProviderId = "youtube",
            Error = new ProviderError { Code = code, Message = message, IsTransient = isTransient }
        };
}
