using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters.Facebook;

namespace Syncra.Infrastructure.Publishing.Adapters;

public sealed class FacebookPublishAdapter : IPublishAdapter
{
    private readonly HttpClient _httpClient;
    private readonly IMediaRepository _mediaRepository;
    private readonly StorageOptions _storageOptions;
    private readonly ILogger<FacebookPublishAdapter> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public FacebookPublishAdapter(
        HttpClient httpClient,
        IMediaRepository mediaRepository,
        IOptions<StorageOptions> storageOptions,
        ILogger<FacebookPublishAdapter> logger)
    {
        _httpClient = httpClient;
        _mediaRepository = mediaRepository;
        _storageOptions = storageOptions.Value;
        _logger = logger;
    }

    public string ProviderId => "facebook";

    public async Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entityType = request.Metadata.GetValueOrDefault("type") ?? "page";
            var entityId = entityType == "group"
                ? request.Metadata.GetValueOrDefault("groupId")
                : request.Metadata.GetValueOrDefault("pageId");

            if (string.IsNullOrEmpty(entityId))
            {
                var entityTypeName = entityType == "group" ? "Group" : "Page";
                return new PublishResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = $"{entityType}_not_configured",
                        Message = $"Facebook {entityTypeName} ID not found. Please reconnect your Facebook account.",
                        IsTransient = false
                    }
                };
            }

            // Use page access token if provided, otherwise fall back to user access token
            var pageAccessToken = request.Metadata.GetValueOrDefault("pageAccessToken") ?? accessToken;

            if (request.MediaIds.Count == 0)
            {
                return await PublishTextPostAsync(entityId, entityType, pageAccessToken, request, cancellationToken);
            }

            var mediaItems = await _mediaRepository.GetByIdsAsync(request.MediaIds);
            var contentType = DetectContentType(request, mediaItems);

            return contentType switch
            {
                FacebookContentType.Video => await PublishVideoAsync(entityId, entityType, pageAccessToken, request, mediaItems, cancellationToken),
                FacebookContentType.Photo => await PublishPhotoAsync(entityId, entityType, pageAccessToken, request, mediaItems, cancellationToken),
                _ => await PublishTextPostAsync(entityId, entityType, pageAccessToken, request, cancellationToken)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while publishing to Facebook.");
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

    private async Task<PublishResult> PublishTextPostAsync(
        string entityId,
        string entityType,
        string pageAccessToken,
        PublishRequest request,
        CancellationToken cancellationToken)
    {
        var endpoint = entityType == "group" ? "feed" : "feed";
        var body = JsonSerializer.Serialize(new
        {
            message = request.Content,
            access_token = pageAccessToken
        });

        var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://graph.facebook.com/v25.0/{entityId}/{endpoint}")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            return MapFacebookError(response, responseBody);

        var postResponse = JsonSerializer.Deserialize<FacebookPostResponse>(responseBody, JsonOptions);
        var postId = postResponse?.Id;

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = postId,
            ExternalUrl = string.IsNullOrEmpty(postId) ? null : $"https://www.facebook.com/{postId}",
            Metadata = new Dictionary<string, string> { ["postId"] = postId ?? string.Empty }
        };
    }

    private async Task<PublishResult> PublishPhotoAsync(
        string entityId,
        string entityType,
        string pageAccessToken,
        PublishRequest request,
        IReadOnlyList<Syncra.Domain.Entities.Media> mediaItems,
        CancellationToken cancellationToken)
    {
        var media = mediaItems.FirstOrDefault();
        if (media == null)
            return await PublishTextPostAsync(entityId, entityType, pageAccessToken, request, cancellationToken);

        var filePath = Path.Combine(_storageOptions.LocalRootPath, Path.GetFileName(media.FileUrl));
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("Facebook photo upload: local file not found at {FilePath}", filePath);
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "file_not_found",
                    Message = $"Media file not found on storage: {media.FileName}",
                    IsTransient = false
                }
            };
        }

        var fileBytes = await File.ReadAllBytesAsync(filePath, cancellationToken);

        var form = new MultipartFormDataContent();
        form.Add(new StringContent(request.Content), "caption");
        form.Add(new StringContent(pageAccessToken), "access_token");
        form.Add(new StringContent("true"), "published");

        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(
            string.IsNullOrEmpty(media.MimeType) ? "image/jpeg" : media.MimeType);
        form.Add(fileContent, "source", media.FileName ?? "photo.jpg");

        var endpoint = entityType == "group" ? "photos" : "photos";
        var response = await _httpClient.PostAsync(
            $"https://graph.facebook.com/v25.0/{entityId}/{endpoint}", form, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            return MapFacebookError(response, responseBody);

        var postResponse = JsonSerializer.Deserialize<FacebookPostResponse>(responseBody, JsonOptions);
        // Prefer post_id (the page post) over photo id
        var postId = postResponse?.PostId ?? postResponse?.Id;

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = postId,
            ExternalUrl = string.IsNullOrEmpty(postId) ? null : $"https://www.facebook.com/{postId}",
            Metadata = new Dictionary<string, string> { ["postId"] = postId ?? string.Empty }
        };
    }

    private async Task<PublishResult> PublishVideoAsync(
        string entityId,
        string entityType,
        string pageAccessToken,
        PublishRequest request,
        IReadOnlyList<Syncra.Domain.Entities.Media> mediaItems,
        CancellationToken cancellationToken)
    {
        var media = mediaItems.FirstOrDefault(m => m.MediaType == "video") ?? mediaItems.FirstOrDefault();
        if (media == null)
            return await PublishTextPostAsync(entityId, entityType, pageAccessToken, request, cancellationToken);

        var filePath = Path.Combine(_storageOptions.LocalRootPath, Path.GetFileName(media.FileUrl));
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("Facebook video upload: local file not found at {FilePath}", filePath);
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "file_not_found",
                    Message = $"Media file not found on storage: {media.FileName}",
                    IsTransient = false
                }
            };
        }

        var fileBytes = await File.ReadAllBytesAsync(filePath, cancellationToken);
        var title = request.Content.Length > 100 ? request.Content[..100] : request.Content;

        var form = new MultipartFormDataContent();
        form.Add(new StringContent(request.Content), "description");
        form.Add(new StringContent(title), "title");
        form.Add(new StringContent(pageAccessToken), "access_token");
        form.Add(new StringContent("true"), "published");

        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(
            string.IsNullOrEmpty(media.MimeType) ? "video/mp4" : media.MimeType);
        form.Add(fileContent, "source", media.FileName ?? "video.mp4");

        var endpoint = entityType == "group" ? "videos" : "videos";
        var response = await _httpClient.PostAsync(
            $"https://graph.facebook.com/v25.0/{entityId}/{endpoint}", form, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            return MapFacebookError(response, responseBody);

        var postResponse = JsonSerializer.Deserialize<FacebookPostResponse>(responseBody, JsonOptions);
        var videoId = postResponse?.Id;

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = videoId,
            ExternalUrl = string.IsNullOrEmpty(videoId) ? null : $"https://www.facebook.com/video.php?v={videoId}",
            Metadata = new Dictionary<string, string> { ["videoId"] = videoId ?? string.Empty }
        };
    }

    private static FacebookContentType DetectContentType(
        PublishRequest request,
        IReadOnlyList<Syncra.Domain.Entities.Media> mediaItems)
    {
        if (!request.MediaIds.Any()) return FacebookContentType.TextOnly;
        var first = mediaItems.FirstOrDefault();
        if (first == null) return FacebookContentType.TextOnly;
        return first.MimeType?.StartsWith("video/", StringComparison.OrdinalIgnoreCase) == true
            ? FacebookContentType.Video
            : FacebookContentType.Photo;
    }

    private static readonly JsonSerializerOptions ErrorJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static PublishResult MapFacebookError(HttpResponseMessage response, string body)
    {
        FacebookApiError? apiError = null;
        try { apiError = JsonSerializer.Deserialize<FacebookApiError>(body, ErrorJsonOptions); } catch { }

        var errorCode = apiError?.Error?.Code ?? 0;
        var errorMessage = apiError?.Error?.Message ?? $"Facebook API returned {(int)response.StatusCode}.";

        // Token expired
        if (errorCode == 190)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "unauthorized",
                    Message = "Page access token expired. Please reconnect your Facebook account.",
                    IsTransient = false
                }
            };
        }

        // Permission denied
        if (errorCode == 200 || errorCode == 10)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "permission_denied",
                    Message = "Missing pages_manage_posts permission.",
                    IsTransient = false
                }
            };
        }

        // Rate limited
        if (errorCode == 368 || errorCode == 32 || errorCode == 4)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "rate_limited",
                    Message = "Facebook rate limit reached. Try again later.",
                    IsTransient = true
                }
            };
        }

        // Invalid parameter
        if (errorCode == 100)
        {
            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "invalid_parameter",
                    Message = errorMessage,
                    IsTransient = false
                }
            };
        }

        return new PublishResult
        {
            IsSuccess = false,
            Error = new ProviderError
            {
                Code = $"facebook_error_{errorCode}",
                Message = errorMessage,
                Details = body,
                IsTransient = (int)response.StatusCode >= 500
            }
        };
    }
}
