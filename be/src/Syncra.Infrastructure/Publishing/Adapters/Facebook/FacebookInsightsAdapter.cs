using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing.Adapters.Facebook;

public sealed class FacebookInsightsAdapter : IAnalyticsAdapter
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FacebookInsightsAdapter> _logger;

    private const string GraphApiBaseUrl = "https://graph.facebook.com/v18.0";

    public FacebookInsightsAdapter(HttpClient httpClient, ILogger<FacebookInsightsAdapter> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public string ProviderId => "facebook";

    public async Task<ProviderAnalyticsResult> GetPostAnalyticsAsync(
        string accessToken,
        AnalyticsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.ExternalId))
        {
            return ErrorResult("missing_external_id", "ExternalId (postId) is required for post analytics.");
        }

        // Facebook post insights metrics
        var metrics = "post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total,post_clicks";
        var url = $"{GraphApiBaseUrl}/{request.ExternalId}/insights?metric={metrics}&access_token={Uri.EscapeDataString(accessToken)}";

        var (json, error) = await FetchAsync(url, cancellationToken);
        if (error != null) return error;

        return ParsePostInsightsResponse(json!, ProviderId);
    }

    public async Task<ProviderAnalyticsResult> GetAccountAnalyticsAsync(
        string accessToken,
        AnalyticsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.AccountId))
        {
            return ErrorResult("missing_account_id", "Facebook Page ID required. Pass pageId in AnalyticsRequest.AccountId.");
        }

        var pageId = request.AccountId;
        var startDate = request.StartDateUtc;
        var endDate = request.EndDateUtc;

        // Page-level metrics (period=day, aggregate over date range)
        var metrics = "page_impressions,page_impressions_unique,page_post_engagements,page_fans,page_fan_adds,page_views_total";
        var sinceUnix = new DateTimeOffset(startDate).ToUnixTimeSeconds();
        var untilUnix = new DateTimeOffset(endDate).ToUnixTimeSeconds();

        var url = $"{GraphApiBaseUrl}/{pageId}/insights?metric={metrics}&period=day&since={sinceUnix}&until={untilUnix}&access_token={Uri.EscapeDataString(accessToken)}";

        var (json, error) = await FetchAsync(url, cancellationToken);
        if (error != null) return error;

        return ParseAccountInsightsResponse(json!, ProviderId);
    }

    private async Task<(JsonNode? json, ProviderAnalyticsResult? error)> FetchAsync(
        string url,
        CancellationToken cancellationToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            var response = await _httpClient.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return (null, MapFacebookError(response.StatusCode, body));
            }

            JsonNode? json = null;
            try { json = JsonSerializer.Deserialize<JsonNode>(body); }
            catch { /* ignore parse errors */ }

            return (json, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception fetching Facebook Insights.");
            return (null, ErrorResult("internal_error", ex.Message, isTransient: true));
        }
    }

    private ProviderAnalyticsResult ParsePostInsightsResponse(JsonNode json, string providerId)
    {
        var result = new ProviderAnalyticsResult { IsSuccess = true, ProviderId = providerId };

        var data = json["data"]?.AsArray();
        if (data == null || data.Count == 0)
        {
            return result;
        }

        // Build dictionary of metric name -> value
        var metrics = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in data)
        {
            var name = item?["name"]?.ToString();
            var values = item?["values"]?.AsArray();
            if (!string.IsNullOrEmpty(name) && values != null && values.Count > 0)
            {
                // Get the last value (most recent)
                var lastValue = values[values.Count - 1];
                if (long.TryParse(lastValue?["value"]?.ToString(), out var val))
                {
                    metrics[name] = val;
                }
            }
        }

        // Map to normalized fields
        result.Impressions = metrics.GetValueOrDefault("post_impressions");
        result.Reach = metrics.GetValueOrDefault("post_impressions_unique");
        result.EngagementRate = result.Reach > 0
            ? (double?)((double)metrics.GetValueOrDefault("post_engaged_users") / result.Reach * 100)
            : null;
        result.Clicks = metrics.GetValueOrDefault("post_clicks");

        // Store reactions breakdown in RawMetrics
        if (metrics.TryGetValue("post_reactions_by_type_total", out var reactionsStr))
        {
            result.RawMetrics["reactions"] = reactionsStr;
        }

        return result;
    }

    private ProviderAnalyticsResult ParseAccountInsightsResponse(JsonNode json, string providerId)
    {
        var result = new ProviderAnalyticsResult { IsSuccess = true, ProviderId = providerId };

        var data = json["data"]?.AsArray();
        if (data == null || data.Count == 0)
        {
            return result;
        }

        // Aggregate values across all days
        var aggregated = new Dictionary<string, long>();

        foreach (var item in data)
        {
            var name = item?["name"]?.ToString();
            var values = item?["values"]?.AsArray();
            if (string.IsNullOrEmpty(name) || values == null) continue;

            if (!aggregated.ContainsKey(name))
            {
                aggregated[name] = 0;
            }

            foreach (var valueObj in values)
            {
                if (long.TryParse(valueObj?["value"]?.ToString(), out var val))
                {
                    aggregated[name] += val;
                }
            }
        }

        // Map to normalized fields
        result.Impressions = aggregated.GetValueOrDefault("page_impressions");
        result.Reach = aggregated.GetValueOrDefault("page_impressions_unique");
        result.Views = aggregated.GetValueOrDefault("page_views_total");

        // Store additional metrics in RawMetrics
        if (aggregated.TryGetValue("page_fans", out var fans))
            result.RawMetrics["page_fans"] = fans;
        if (aggregated.TryGetValue("page_fan_adds", out var fanAdds))
            result.RawMetrics["page_fan_adds"] = fanAdds;
        if (aggregated.TryGetValue("page_post_engagements", out var engagements))
            result.RawMetrics["page_post_engagements"] = engagements;

        return result;
    }

    private ProviderAnalyticsResult MapFacebookError(System.Net.HttpStatusCode statusCode, string body)
    {
        _logger.LogWarning("Facebook Insights API returned {StatusCode}: {Body}", (int)statusCode, body);

        FacebookApiError? apiError = null;
        try { apiError = JsonSerializer.Deserialize<FacebookApiError>(body); }
        catch { }

        var errorCode = apiError?.Error?.Code ?? 0;

        // Token expired
        if (errorCode == 190)
        {
            return ErrorResult("unauthorized", "Page access token expired. Please reconnect your Facebook account.");
        }

        // Permission denied
        if (errorCode == 200 || errorCode == 10)
        {
            return ErrorResult("permission_denied", "Missing read_insights permission.");
        }

        // Rate limited
        if (errorCode == 368 || errorCode == 32 || errorCode == 4)
        {
            return ErrorResult("rate_limited", "Facebook rate limit reached. Try again later.", isTransient: true);
        }

        // Invalid metric
        if (errorCode == 100)
        {
            return ErrorResult("invalid_metric", apiError?.Error?.Message ?? "Invalid metric parameter.");
        }

        return ErrorResult($"facebook_error_{errorCode}", apiError?.Error?.Message ?? $"Facebook API returned {(int)statusCode}.");
    }

    private static ProviderAnalyticsResult ErrorResult(string code, string message, bool isTransient = false) => new()
    {
        IsSuccess = false,
        ProviderId = "facebook",
        Error = new ProviderError { Code = code, Message = message, IsTransient = isTransient }
    };
}
