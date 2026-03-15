using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters.YouTube;

namespace Syncra.Infrastructure.Publishing.Adapters;

public sealed class YouTubePublishAdapter : IPublishAdapter
{
    private readonly HttpClient _httpClient;
    private readonly IMediaRepository _mediaRepository;
    private readonly StorageOptions _storageOptions;
    private readonly ILogger<YouTubePublishAdapter> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public YouTubePublishAdapter(
        HttpClient httpClient,
        IMediaRepository mediaRepository,
        IOptions<StorageOptions> storageOptions,
        ILogger<YouTubePublishAdapter> logger)
    {
        _httpClient = httpClient;
        _mediaRepository = mediaRepository;
        _storageOptions = storageOptions.Value;
        _logger = logger;
    }

    public string ProviderId => "youtube";

    public async Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request.MediaIds.Count == 0)
            {
                return new PublishResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "media_required",
                        Message = "YouTube requires at least one video to publish.",
                        IsTransient = false
                    }
                };
            }

            var mediaItems = await _mediaRepository.GetByIdsAsync(request.MediaIds);
            var video = mediaItems.FirstOrDefault(m => m.MediaType == "video")
                        ?? mediaItems.FirstOrDefault();

            if (video == null)
            {
                return new PublishResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "media_not_found",
                        Message = "Could not find the specified media file.",
                        IsTransient = false
                    }
                };
            }

            // Resolve local file path (same pattern as TikTokPublishAdapter)
            var filePath = Path.Combine(_storageOptions.LocalRootPath, Path.GetFileName(video.FileUrl));
            if (!File.Exists(filePath))
            {
                _logger.LogWarning("YouTube upload: local file not found at {FilePath}", filePath);
                return new PublishResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "file_not_found",
                        Message = $"Media file not found on storage: {video.FileName}",
                        IsTransient = false
                    }
                };
            }

            var fileBytes = await File.ReadAllBytesAsync(filePath, cancellationToken);

            var videoMeta = new YouTubeVideoMetadata
            {
                ContentType = string.IsNullOrEmpty(video.MimeType) ? "video/mp4" : video.MimeType,
                SizeBytes = video.SizeBytes
                // Duration/Width/Height not available in Media entity yet — IsShort uses size heuristic
            };

            return await UploadVideoAsync(accessToken, request, fileBytes, videoMeta, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while publishing to YouTube.");
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "internal_error",
                    Message = ex.Message,
                    IsTransient = true
                }
            };
        }
    }

    private async Task<PublishResult> UploadVideoAsync(
        string accessToken,
        PublishRequest request,
        byte[] fileBytes,
        YouTubeVideoMetadata videoMeta,
        CancellationToken cancellationToken)
    {
        var insertRequest = BuildInsertRequest(request, videoMeta);
        var metadataJson = JsonSerializer.Serialize(insertRequest, JsonOptions);

        // Step 1: Initiate resumable upload session
        var initiateRequest = new HttpRequestMessage(
            HttpMethod.Post,
            "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status");

        initiateRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        initiateRequest.Headers.Add("X-Upload-Content-Type", videoMeta.ContentType);
        initiateRequest.Headers.Add("X-Upload-Content-Length", fileBytes.Length.ToString());
        initiateRequest.Content = new StringContent(metadataJson, Encoding.UTF8, "application/json");

        var initiateResponse = await _httpClient.SendAsync(initiateRequest, cancellationToken);

        if (!initiateResponse.IsSuccessStatusCode)
        {
            return await MapErrorResponseAsync(initiateResponse, cancellationToken);
        }

        if (initiateResponse.Headers.Location is null)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "upload_session_failed",
                    Message = "YouTube did not return an upload session URI.",
                    IsTransient = true
                }
            };
        }

        var uploadSessionUri = initiateResponse.Headers.Location!.ToString();

        // Step 2: Upload video bytes to the session URI
        var uploadRequest = new HttpRequestMessage(HttpMethod.Put, uploadSessionUri);
        uploadRequest.Content = new ByteArrayContent(fileBytes);
        uploadRequest.Content.Headers.ContentType = new MediaTypeHeaderValue(videoMeta.ContentType);
        uploadRequest.Content.Headers.ContentLength = fileBytes.Length;

        var uploadResponse = await _httpClient.SendAsync(uploadRequest, cancellationToken);

        if (!uploadResponse.IsSuccessStatusCode)
        {
            return await MapErrorResponseAsync(uploadResponse, cancellationToken);
        }

        var responseBody = await uploadResponse.Content.ReadAsStringAsync(cancellationToken);
        YouTubeVideoInsertResponse? videoResponse = null;
        try
        {
            videoResponse = JsonSerializer.Deserialize<YouTubeVideoInsertResponse>(responseBody, JsonOptions);
        }
        catch
        {
            // ignore parse errors
        }

        var videoId = videoResponse?.Id;
        if (string.IsNullOrEmpty(videoId))
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "upload_response_invalid",
                    Message = "YouTube upload succeeded but no video ID was returned.",
                    IsTransient = false
                }
            };
        }

        var title = insertRequest.Snippet.Title;

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = videoId,
            ExternalUrl = videoMeta.IsShort
                ? $"https://www.youtube.com/shorts/{videoId}"
                : $"https://www.youtube.com/watch?v={videoId}",
            Metadata = new Dictionary<string, string>
            {
                ["videoId"] = videoId,
                ["isShort"] = videoMeta.IsShort.ToString().ToLower(),
                ["title"] = title
            }
        };
    }

    private static YouTubeVideoInsertRequest BuildInsertRequest(PublishRequest request, YouTubeVideoMetadata videoMeta)
    {
        var title = request.Content.Length > 100
            ? request.Content[..100]
            : request.Content;

        var description = request.Content;
        var tags = new List<string>();

        if (videoMeta.IsShort)
        {
            if (!description.Contains("#Shorts", StringComparison.OrdinalIgnoreCase))
                description += "\n\n#Shorts";
            tags.Add("Shorts");
        }

        return new YouTubeVideoInsertRequest
        {
            Snippet = new YouTubeVideoSnippet
            {
                Title = title,
                Description = description,
                CategoryId = "22",
                Tags = tags
            },
            Status = new YouTubeVideoStatus
            {
                PrivacyStatus = "public",
                SelfDeclaredMadeForKids = false
            }
        };
    }

    private static async Task<PublishResult> MapErrorResponseAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if ((int)response.StatusCode == 401)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "unauthorized",
                    Message = "Access token expired or invalid.",
                    IsTransient = false
                }
            };
        }

        if ((int)response.StatusCode == 403)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "quota_exceeded",
                    Message = "YouTube API quota exceeded or insufficient permissions.",
                    IsTransient = false
                }
            };
        }

        // Try to parse YouTube error body
        string? message = null;
        try
        {
            var apiError = JsonSerializer.Deserialize<YouTubeApiError>(body, JsonOptions);
            message = apiError?.Error?.Message;
        }
        catch { /* ignore */ }

        return new PublishResult
        {
            IsSuccess = false,
            Error = new ProviderError
            {
                Code = $"youtube_error_{(int)response.StatusCode}",
                Message = message ?? $"YouTube API returned {(int)response.StatusCode}.",
                IsTransient = response.StatusCode >= System.Net.HttpStatusCode.InternalServerError
            }
        };
    }
}
