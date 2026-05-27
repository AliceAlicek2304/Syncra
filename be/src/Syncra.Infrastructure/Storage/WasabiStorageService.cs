
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
        // Generate a unique storage key to avoid name collisions.
        var storageKey = $"{Path.GetRandomFileName().Replace(".", "")}_{fileName}";

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

    public void Dispose() => _s3Client.Dispose();
}
