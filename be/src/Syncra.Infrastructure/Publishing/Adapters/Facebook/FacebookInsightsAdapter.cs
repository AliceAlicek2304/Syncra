using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing.Adapters.Facebook;

/// <summary>
/// Matches Potiz facebook.provider.ts analytics() and postAnalytics() methods exactly.
/// </summary>
public sealed class FacebookInsightsAdapter : IAnalyticsAdapter
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FacebookInsightsAdapter> _logger;

    private const string GraphApiBaseUrl = "https://graph.facebook.com/v20.0";

    public FacebookInsightsAdapter(HttpClient httpClient, ILogger<FacebookInsightsAdapter> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public string ProviderId => "facebook";

    /// <summary>
    /// Matches Potiz facebook.provider.ts:489 analytics().
    /// Metrics: page_impressions_unique, page_posts_impressions_unique, page_post_engagements,
    ///          page_daily_follows, page_video_views
    /// NOTE: id here is ExternalAccountId (user id). Page insights need pageId from metadata.
    ///       integrationId carries the metadata JSON so we can extract pageId + pageAccessToken.
    /// </summary>
    public async Task<List<AnalyticsData>> GetAnalyticsAsync(
        string id,
        string accessToken,
        int date,
        CancellationToken cancellationToken = default)
    {
        // Resolve page access token and page id from integration metadata
        var effectiveToken = ResolvePageAccessToken(id, accessToken);
        var pageId = ResolvePageId(id);

        var until = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var since = DateTimeOffset.UtcNow.AddDays(-date).ToUnixTimeSeconds();

        var metrics = "page_impressions_unique,page_posts_impressions_unique,page_post_engagements,page_daily_follows,page_video_views";
        var url = $"{GraphApiBaseUrl}/{pageId}/insights?metric={metrics}&access_token={Uri.EscapeDataString(effectiveToken)}&period=day&since={since}&until={until}";

        var (json, error) = await FetchAsync(url, cancellationToken);
        if (error != null) throw error;

        var data = json?["data"]?.AsArray();
        if (data == null) return new List<AnalyticsData>();

        var result = new List<AnalyticsData>();
        foreach (var d in data)
        {
            var name = d?["name"]?.ToString();
            var label = MapPageMetricLabel(name);
            var values = d?["values"]?.AsArray();
            if (values == null) continue;

            var points = new List<AnalyticsDataPoint>();
            foreach (var v in values)
            {
                var total = v?["value"]?.ToString() ?? "0";
                var endTime = v?["end_time"]?.ToString();
                var dateStr = endTime != null && DateTimeOffset.TryParse(endTime, out var dt)
                    ? dt.ToString("yyyy-MM-dd")
                    : DateTime.UtcNow.ToString("yyyy-MM-dd");

                points.Add(new AnalyticsDataPoint { Total = total, Date = dateStr });
            }

            result.Add(new AnalyticsData
            {
                Label = label,
                PercentageChange = 5, // Matches Potiz facebook.provider.ts:515
                Data = points
            });
        }

        return result;
    }

    /// <summary>
    /// Matches Potiz facebook.provider.ts:524 postAnalytics().
    /// Metrics: post_impressions_unique, post_reactions_by_type_total, post_clicks, post_clicks_by_type
    /// NOTE: Facebook post insights require a Page Access Token, not a User Access Token.
    ///       integrationId here carries the integration metadata JSON so we can extract pageAccessToken.
    /// </summary>
    public async Task<List<AnalyticsData>> GetPostAnalyticsAsync(
        string integrationId,
        string accessToken,
        string postId,
        int date,
        CancellationToken cancellationToken = default)
    {
        // Resolve page access token from integration metadata — Facebook requires it for post insights
        var effectiveToken = ResolvePageAccessToken(integrationId, accessToken);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var url = $"{GraphApiBaseUrl}/{postId}/insights?metric=post_impressions_unique,post_reactions_by_type_total,post_clicks,post_clicks_by_type&access_token={Uri.EscapeDataString(effectiveToken)}";

        var (json, error) = await FetchAsync(url, cancellationToken);
        if (error != null) throw error;

        var data = json?["data"]?.AsArray();
        if (data == null || data.Count == 0) return new List<AnalyticsData>();

        var result = new List<AnalyticsData>();

        foreach (var metric in data)
        {
            var name = metric?["name"]?.ToString();
            var values = metric?["values"]?.AsArray();
            var value = values?[0]?["value"];
            if (value == null) continue;

            string label;
            string total;

            switch (name)
            {
                case "post_impressions_unique":
                    // Matches Potiz facebook.provider.ts:555
                    label = "Impressions";
                    total = value.ToString() ?? "0";
                    break;

                case "post_clicks":
                    // Matches Potiz facebook.provider.ts:559
                    label = "Clicks";
                    total = value.ToString() ?? "0";
                    break;

                case "post_clicks_by_type":
                    // Matches Potiz facebook.provider.ts:568 — sum all click types
                    label = "Clicks by Type";
                    total = SumObjectValues(value);
                    break;

                case "post_reactions_by_type_total":
                    // Matches Potiz facebook.provider.ts:578 — sum all reaction types
                    label = "Reactions";
                    total = SumObjectValues(value);
                    break;

                default:
                    continue;
            }

            result.Add(new AnalyticsData
            {
                Label = label,
                PercentageChange = 0, // Matches Potiz facebook.provider.ts:587
                Data = new List<AnalyticsDataPoint>
                {
                    new() { Total = total, Date = today }
                }
            });
        }

        return result;
    }

    /// <summary>
    /// Extracts pageAccessToken from integration metadata JSON.
    /// Falls back to the user accessToken if not found.
    /// Metadata format: {"pageId":"...","pageAccessToken":"...","pageName":"..."}
    /// </summary>
    private static string ResolvePageAccessToken(string metadataJson, string fallbackToken)
    {
        if (string.IsNullOrEmpty(metadataJson)) return fallbackToken;
        try
        {
            var meta = JsonSerializer.Deserialize<Dictionary<string, string>>(metadataJson);
            var pageToken = meta?.GetValueOrDefault("pageAccessToken");
            return !string.IsNullOrEmpty(pageToken) ? pageToken : fallbackToken;
        }
        catch { return fallbackToken; }
    }

    /// <summary>
    /// Extracts pageId from integration metadata JSON.
    /// Falls back to the raw id string if not found.
    /// </summary>
    private static string ResolvePageId(string metadataJson)
    {
        if (string.IsNullOrEmpty(metadataJson)) return metadataJson;
        try
        {
            var meta = JsonSerializer.Deserialize<Dictionary<string, string>>(metadataJson);
            var pageId = meta?.GetValueOrDefault("pageId");
            return !string.IsNullOrEmpty(pageId) ? pageId : metadataJson;
        }
        catch { return metadataJson; }
    }

    private static string MapPageMetricLabel(string? name) => name switch    {
        // Matches Potiz facebook.provider.ts:506-513
        "page_impressions_unique"        => "Page Impressions",
        "page_post_engagements"          => "Posts Engagement",
        "page_daily_follows"             => "Page followers",
        "page_video_views"               => "Videos views",
        _                                => "Posts Impressions"
    };

    private static string SumObjectValues(JsonNode? node)
    {
        if (node == null) return "0";
        try
        {
            var obj = node.AsObject();
            var sum = obj.Sum(kv => kv.Value?.GetValue<long>() ?? 0);
            return sum.ToString();
        }
        catch
        {
            return "0";
        }
    }

    private async Task<(JsonNode? json, RefreshTokenException? error)> FetchAsync(
        string url,
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("[FacebookInsights] GET {Url}", url.Split("access_token=")[0] + "access_token=***");
            var response = await _httpClient.GetAsync(url, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            _logger.LogInformation("[FacebookInsights] Response {StatusCode}: {Body}", (int)response.StatusCode, body.Length > 500 ? body[..500] : body);

            JsonNode? json = null;
            try { json = JsonSerializer.Deserialize<JsonNode>(body); } catch { }

            // Check for token errors — matches Potiz handleErrors() refresh-token cases
            if (!response.IsSuccessStatusCode || json?["error"] != null)
            {
                var errorCode = json?["error"]?["code"]?.GetValue<int>() ?? 0;
                var errorMsg = json?["error"]?["message"]?.ToString() ?? body;

                // Token expired/revoked — trigger RefreshToken retry (Potiz pattern)
                if (errorCode == 190 || body.Contains("Error validating access token") ||
                    body.Contains("REVOKED_ACCESS_TOKEN"))
                {
                    return (null, new RefreshTokenException(errorMsg));
                }

                _logger.LogWarning("[FacebookInsights] API error {Code}: {Message}", errorCode, errorMsg);
                return (null, null);
            }

            return (json, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FacebookInsights] Exception fetching.");
            return (null, null);
        }
    }
}
