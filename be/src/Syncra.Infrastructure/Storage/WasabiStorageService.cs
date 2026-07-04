
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;

namespace Syncra.Infrastructure.Storage;

/// <summary>
/// Stores media files in a Wasabi S3-compatible bucket.
/// The <see cref="AmazonS3Client"/> is initialised once per service lifetime and
/// is thread-safe, so the class is registered as a singleton.
/// </summary>
public sealed class WasabiStorageService : IStorageService, IDisposable
{
    private readonly IAmazonS3 _s3Client;
    private readonly WasabiOptions _options;
    private readonly ILogger<WasabiStorageService> _logger;

    public WasabiStorageService(IOptions<WasabiOptions> options, ILogger<WasabiStorageService> logger)
    {
        _options = options.Value;
        _logger = logger;

        // Build S3-compatible client pointing at the Wasabi endpoint.
        // UseChunkEncoding is set to false globally: Wasabi does not support
        // STREAMING-AWS4-HMAC-SHA256-PAYLOAD-TRAILER (see Wasabi docs).
        var config = new AmazonS3Config
        {
            ServiceURL = _options.ServiceUrl,
            ForcePathStyle = true          // required for custom-endpoint S3 providers
        };

        var credentials = new BasicAWSCredentials(_options.AccessKey, _options.SecretKey);
        _s3Client = new AmazonS3Client(credentials, config);
    }

    /// <inheritdoc/>
    public async Task<StorageUploadResult> SaveAsync(Stream stream, string fileName, string mimeType)
    {
        // Keep storage keys URL-safe; the original filename may contain spaces or Unicode.
        var storageKey = $"{Guid.NewGuid():N}{GetSafeExtension(fileName, mimeType)}";

        try
        {
            var putRequest = new PutObjectRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey,
                InputStream = stream,
                ContentType = mimeType,
                // Required for Wasabi: chunked transfer encoding is not supported.
                UseChunkEncoding = false,
                // Make the object publicly readable so we can return a stable URL.
                CannedACL = S3CannedACL.PublicRead
            };

            await _s3Client.PutObjectAsync(putRequest);

            // Construct the public URL in the standard S3 path-style format.
            var publicUrl = $"{_options.ServiceUrl.TrimEnd('/')}/{_options.BucketName}/{storageKey}";

            _logger.LogInformation("Uploaded file {FileName} to Wasabi as key {StorageKey}.", fileName, storageKey);

            return new StorageUploadResult
            {
                StorageKey = storageKey,
                PublicUrl = publicUrl
            };
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Wasabi S3 error while uploading file {FileName}. ErrorCode={ErrorCode}.",
                fileName, ex.ErrorCode);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while uploading file {FileName} to Wasabi.", fileName);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task DeleteAsync(string storageKey)
    {
        try
        {
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey
            };

            await _s3Client.DeleteObjectAsync(deleteRequest);

            _logger.LogInformation("Deleted Wasabi object with key {StorageKey}.", storageKey);
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Wasabi S3 error while deleting key {StorageKey}. ErrorCode={ErrorCode}.",
                storageKey, ex.ErrorCode);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while deleting key {StorageKey} from Wasabi.", storageKey);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Stream> OpenReadAsync(string storageKey)
    {
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey
            };

            var response = await _s3Client.GetObjectAsync(getRequest);
            return response.ResponseStream;
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Wasabi S3 error while reading key {StorageKey}. ErrorCode={ErrorCode}.",
                storageKey, ex.ErrorCode);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while reading key {StorageKey} from Wasabi.", storageKey);
            throw;
        }
    }

    public string GetPresignedUrl(string storageKeyOrUrl, double expirationHours = 2)
    {
        if (string.IsNullOrEmpty(storageKeyOrUrl)) return string.Empty;

        if (storageKeyOrUrl.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return storageKeyOrUrl;
        }

        // If it's already a full URL, extract the storage key
        var key = storageKeyOrUrl;
        var prefix = $"{_options.ServiceUrl.TrimEnd('/')}/{_options.BucketName}/";
        if (storageKeyOrUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            key = storageKeyOrUrl[prefix.Length..];
        }
        else if (storageKeyOrUrl.StartsWith("http://") || storageKeyOrUrl.StartsWith("https://"))
        {
            // If it is another host's URL (e.g., Zernio URL), return it as-is
            return storageKeyOrUrl;
        }

        // Strip any existing query parameters
        var queryIndex = key.IndexOf('?');
        if (queryIndex >= 0)
        {
            key = key[..queryIndex];
        }

        key = Uri.UnescapeDataString(key);

        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _options.BucketName,
                Key = key,
                Expires = DateTime.UtcNow.AddHours(expirationHours),
                Verb = HttpVerb.GET
            };
            return _s3Client.GetPreSignedURL(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate presigned URL for key {Key}.", key);
            return storageKeyOrUrl;
        }
    }

    public void Dispose() => _s3Client.Dispose();

    private static string GetSafeExtension(string fileName, string mimeType)
    {
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension) || extension.Length > 16)
        {
            extension = mimeType.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/gif" => ".gif",
                "image/webp" => ".webp",
                "video/mp4" => ".mp4",
                "video/quicktime" => ".mov",
                "video/webm" => ".webm",
                "application/pdf" => ".pdf",
                _ => string.Empty
            };
        }

        return extension.ToLowerInvariant();
    }
}
