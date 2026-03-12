
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing.Adapters;

public sealed class XPublishAdapter : IPublishAdapter
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<XPublishAdapter> _logger;

    public XPublishAdapter(HttpClient httpClient, ILogger<XPublishAdapter> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public string ProviderId => "x";

    public async Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var tweetData = new
            {
                text = request.Content
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.twitter.com/2/tweets");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            httpRequest.Content = new StringContent(JsonSerializer.Serialize(tweetData), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("X publish failed with status code {StatusCode}. Body: {ResponseBody}", 
                    response.StatusCode, responseBody);
                
                return new PublishResult
                {
                    IsSuccess = false,
                    Error = PublishingErrorHelper.FromHttpFailure(response.StatusCode, responseBody)
                };
            }

            var json = JsonNode.Parse(responseBody);
            var id = json?["data"]?["id"]?.ToString();

            return new PublishResult
            {
                IsSuccess = true,
                ExternalId = id,
                ExternalUrl = id != null ? $"https://twitter.com/any/status/{id}" : null,
                Metadata = new Dictionary<string, string>
                {
                    ["response_body"] = responseBody
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while publishing to X.");
            return new PublishResult
            {
                IsSuccess = false,
                Error = PublishingErrorHelper.FromException(ex)
            };
        }
    }
}
