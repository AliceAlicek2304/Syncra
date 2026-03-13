using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Syncra.Infrastructure.Publishing.Adapters.TikTok;

public sealed class TikTokApiClient : ITikTokApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TikTokApiClient> _logger;
    private const string BaseUrl = "https://open.tiktokapis.com/v2";

    public TikTokApiClient(HttpClient httpClient, ILogger<TikTokApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<TikTokVideoInitResponse> InitializeVideoUploadAsync(
        string accessToken,
        TikTokVideoInitRequest request,
        CancellationToken cancellationToken = default)
    {
        var options = GetJsonOptions();
        var requestJson = JsonSerializer.Serialize(request, options);
        _logger.LogDebug("TikTok video init request: {RequestJson}", requestJson);

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/post/publish/video/init/");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpRequest.Content = JsonContent.Create(request, options: options);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogDebug("TikTok video init response: {ResponseJson}", responseJson);

        var result = JsonSerializer.Deserialize<TikTokVideoInitResponse>(responseJson, options);

        return result ?? throw new InvalidOperationException("Failed to deserialize TikTok video init response.");
    }

    public async Task UploadVideoChunkAsync(
        string uploadUrl,
        Stream chunkStream,
        long startByte,
        long totalBytes,
        CancellationToken cancellationToken = default)
    {
        var endByte = startByte + chunkStream.Length - 1;
        var httpRequest = new HttpRequestMessage(HttpMethod.Put, uploadUrl);
        
        // TikTok requires the entire video to be uploaded to the upload_url.
        // For chunked upload, we use the Content-Range header.
        httpRequest.Content = new StreamContent(chunkStream);
        httpRequest.Content.Headers.ContentRange = new ContentRangeHeaderValue(startByte, endByte, totalBytes);
        httpRequest.Content.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<TikTokContentInitResponse> InitializeContentPublishAsync(
        string accessToken,
        TikTokContentInitRequest request,
        CancellationToken cancellationToken = default)
    {
        var options = GetJsonOptions();
        var requestJson = JsonSerializer.Serialize(request, options);
        _logger.LogDebug("TikTok content init request: {RequestJson}", requestJson);

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/post/publish/content/init/");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpRequest.Content = JsonContent.Create(request, options: options);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogDebug("TikTok content init response: {ResponseJson}", responseJson);

        var result = JsonSerializer.Deserialize<TikTokContentInitResponse>(responseJson, options);

        return result ?? throw new InvalidOperationException("Failed to deserialize TikTok content init response.");
    }

    public async Task<TikTokStatusResponse> GetPostStatusAsync(
        string accessToken,
        string publishId,
        CancellationToken cancellationToken = default)
    {
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/post/publish/status/fetch/");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpRequest.Content = JsonContent.Create(new TikTokStatusRequest(publishId), options: GetJsonOptions());

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var result = await response.Content.ReadFromJsonAsync<TikTokStatusResponse>(cancellationToken: cancellationToken);

        return result ?? throw new InvalidOperationException("Failed to deserialize TikTok status response.");
    }

    private static JsonSerializerOptions GetJsonOptions() => new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };
}
