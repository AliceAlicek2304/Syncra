using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Application.Repositories;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters.TikTok;

namespace Syncra.Infrastructure.Publishing.Adapters;

public sealed class TikTokPublishAdapter : IPublishAdapter
{
    private readonly ITikTokApiClient _tikTokApiClient;
    private readonly IMediaRepository _mediaRepository;
    private readonly StorageOptions _storageOptions;
    private readonly ILogger<TikTokPublishAdapter> _logger;

    // TikTok requires chunk size between 5MB and 64MB for FILE_UPLOAD.
    // We'll use 10MB as default if file is large.
    private const long DefaultChunkSize = 10 * 1024 * 1024;

    public TikTokPublishAdapter(
        ITikTokApiClient tikTokApiClient,
        IMediaRepository mediaRepository,
        IOptions<StorageOptions> storageOptions,
        ILogger<TikTokPublishAdapter> logger)
    {
        _tikTokApiClient = tikTokApiClient;
        _mediaRepository = mediaRepository;
        _storageOptions = storageOptions.Value;
        _logger = logger;
    }

    public string ProviderId => "tiktok";

    public async Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var mediaItems = await _mediaRepository.GetByIdsAsync(request.MediaIds);
            
            if (mediaItems.Count == 0)
            {
                return new PublishResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "no_media",
                        Message = "TikTok requires at least one video or photo to publish.",
                        IsTransient = false
                    }
                };
            }

            // TikTok supports one video OR multiple photos.
            // For now, we'll handle the first video found, or all photos if no video.
            var video = mediaItems.FirstOrDefault(m => m.MediaType == "video");
            
            if (video != null)
            {
                return await PublishVideoAsync(accessToken, request, video, cancellationToken);
            }

            var photos = mediaItems.Where(m => m.MediaType == "image").ToList();
            if (photos.Any())
            {
                return await PublishPhotosAsync(accessToken, request, photos, cancellationToken);
            }

            return new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "unsupported_media",
                    Message = "No supported video or photos found for TikTok publishing.",
                    IsTransient = false
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while publishing to TikTok.");
            return new PublishResult
            {
                IsSuccess = false,
                Error = PublishingErrorHelper.FromException(ex)
            };
        }
    }

    /// <summary>
    /// Publishes a video to TikTok.
    /// Uses chunked FILE_UPLOAD if the media is stored locally, otherwise uses PULL_FROM_URL.
    /// </summary>
    private async Task<PublishResult> PublishVideoAsync(
        string accessToken,
        PublishRequest request,
        Syncra.Domain.Entities.Media video,
        CancellationToken cancellationToken)
    {
        // Check if the file exists locally. If it does, FILE_UPLOAD is much more reliable
        // and doesn't require domain verification on TikTok's side.
        var filePath = Path.Combine(_storageOptions.LocalRootPath, Path.GetFileName(video.FileUrl));
        
        if (File.Exists(filePath))
        {
            _logger.LogInformation("Using FILE_UPLOAD for TikTok video because file exists locally: {FilePath}", filePath);
            return await PublishVideoViaFileUploadAsync(accessToken, request, video, cancellationToken);
        }

        _logger.LogInformation("Using PULL_FROM_URL for TikTok video because local file was not found.");
        return await PublishVideoViaPullUrlAsync(accessToken, request, video, cancellationToken);
    }

    /// <summary>
    /// Handles chunked video upload to TikTok's servers.
    /// TikTok requires chunks between 5MB and 64MB.
    /// </summary>
    private async Task<PublishResult> PublishVideoViaFileUploadAsync(
        string accessToken,
        PublishRequest request,
        Syncra.Domain.Entities.Media video,
        CancellationToken cancellationToken)
    {
        var filePath = Path.Combine(_storageOptions.LocalRootPath, Path.GetFileName(video.FileUrl));
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("Video file not found in local storage.", filePath);
        }

        var fileSize = new FileInfo(filePath).Length;
        var chunkSize = Math.Min(fileSize, DefaultChunkSize);
        var totalChunks = (int)Math.Ceiling((double)fileSize / chunkSize);

        var title = request.Content;
        if (title?.Length > 150)
        {
            title = title.Substring(0, 147) + "...";
        }

        var initRequest = new TikTokVideoInitRequest(
            PostInfo: new TikTokPostInfo(
                Title: title,
                PrivacyLevel: "SELF_ONLY" // Required for unaudited apps
            ),
            SourceInfo: new TikTokVideoSourceInfo(
                Source: "FILE_UPLOAD",
                VideoSize: fileSize,
                ChunkSize: chunkSize,
                TotalChunkCount: totalChunks
            )
        );

        var initResponse = await _tikTokApiClient.InitializeVideoUploadAsync(accessToken, initRequest, cancellationToken);

        if (initResponse.Error.Code != "ok")
        {
            return MapTikTokError(initResponse.Error);
        }

        var uploadUrl = initResponse.Data.UploadUrl!;
        
        await using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        var buffer = new byte[chunkSize];
        long bytesUploaded = 0;

        for (int i = 0; i < totalChunks; i++)
        {
            var bytesToRead = (int)Math.Min(chunkSize, fileSize - bytesUploaded);
            await fileStream.ReadAsync(buffer, 0, bytesToRead, cancellationToken);
            
            using var chunkStream = new MemoryStream(buffer, 0, bytesToRead);
            await _tikTokApiClient.UploadVideoChunkAsync(uploadUrl, chunkStream, bytesUploaded, fileSize, cancellationToken);
            
            bytesUploaded += bytesToRead;
        }

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = initResponse.Data.PublishId,
            Metadata = new Dictionary<string, string>
            {
                ["publish_id"] = initResponse.Data.PublishId,
                ["method"] = "FILE_UPLOAD",
                ["media_type"] = "video",
                ["video_size"] = fileSize.ToString(),
                ["chunk_count"] = totalChunks.ToString()
            }
        };
    }

    /// <summary>
    /// Tells TikTok to pull a video from a public URL.
    /// </summary>
    private async Task<PublishResult> PublishVideoViaPullUrlAsync(
        string accessToken,
        PublishRequest request,
        Syncra.Domain.Entities.Media video,
        CancellationToken cancellationToken)
    {
        var title = request.Content;
        if (title?.Length > 150)
        {
            title = title.Substring(0, 147) + "...";
        }

        var initRequest = new TikTokVideoInitRequest(
            PostInfo: new TikTokPostInfo(
                Title: title,
                PrivacyLevel: "SELF_ONLY" // Required for unaudited apps
            ),
            SourceInfo: new TikTokVideoSourceInfo(
                Source: "PULL_FROM_URL",
                VideoUrl: video.FileUrl
            )
        );

        var initResponse = await _tikTokApiClient.InitializeVideoUploadAsync(accessToken, initRequest, cancellationToken);

        if (initResponse.Error.Code != "ok")
        {
            return MapTikTokError(initResponse.Error);
        }

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = initResponse.Data.PublishId,
            Metadata = new Dictionary<string, string>
            {
                ["publish_id"] = initResponse.Data.PublishId,
                ["method"] = "PULL_FROM_URL",
                ["media_type"] = "video",
                ["video_url"] = video.FileUrl
            }
        };
    }

    /// <summary>
    /// Tells TikTok to pull one or more photos from public URLs.
    /// </summary>
    private async Task<PublishResult> PublishPhotosAsync(
        string accessToken,
        PublishRequest request,
        List<Syncra.Domain.Entities.Media> photos,
        CancellationToken cancellationToken)
    {
        // TikTok photo publishing only supports PULL_FROM_URL
        var photoUrls = photos.Select(p => p.FileUrl).ToList();
        
        var title = request.Content;
        if (title?.Length > 150)
        {
            title = title.Substring(0, 147) + "...";
        }

        var initRequest = new TikTokContentInitRequest(
            new TikTokContentPostInfo(
                Title: title,
                PrivacyLevel: "SELF_ONLY" // Required for unaudited apps
            ),
            new TikTokContentSourceInfo(
                Source: "PULL_FROM_URL",
                PhotoImages: photoUrls
            )
        );

        var response = await _tikTokApiClient.InitializeContentPublishAsync(accessToken, initRequest, cancellationToken);

        if (response.Error.Code != "ok")
        {
            return MapTikTokError(response.Error);
        }

        return new PublishResult
        {
            IsSuccess = true,
            ExternalId = response.Data.PublishId,
            Metadata = new Dictionary<string, string>
            {
                ["publish_id"] = response.Data.PublishId,
                ["method"] = "PULL_FROM_URL",
                ["media_type"] = "photo",
                ["photo_count"] = photoUrls.Count.ToString()
            }
        };
    }

    private static PublishResult MapTikTokError(TikTokError error)
    {
        // Map common TikTok error codes to domain errors
        // Based on TikTok Content Posting API documentation:
        // https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
        var isTransient = error.Code switch
        {
            "rate_limit_exceeded" => true,
            "internal_error" => true,
            "server_busy" => true,
            "request_timeout" => true,
            "network_error" => true,
            _ => false
        };

        // Standardize the error code prefix for Syncra
        var code = error.Code switch
        {
            "ok" => "SUCCESS",
            "spam_risk_too_many_pending_share" => "TIKTOK_SPAM_RISK_LIMIT",
            "spam_risk_user_banned_from_posting" => "TIKTOK_USER_BANNED",
            "url_ownership_unverified" => "TIKTOK_URL_UNVERIFIED",
            "access_token_invalid" => "TIKTOK_AUTH_INVALID",
            "scope_not_authorized" => "TIKTOK_SCOPE_MISSING",
            "app_version_check_failed" => "TIKTOK_APP_VERSION_OLD",
            _ => $"TIKTOK_{error.Code.ToUpperInvariant()}"
        };

        return new PublishResult
        {
            IsSuccess = false,
            Error = new ProviderError
            {
                Code = code,
                Message = error.Message,
                IsTransient = isTransient,
                Details = $"LogId: {error.LogId}"
            }
        };
    }
}
