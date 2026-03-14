
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;

namespace Syncra.Infrastructure.Storage;

public class LocalMediaStorage : IStorageService
{
    private readonly StorageOptions _options;
    private readonly ILogger<LocalMediaStorage> _logger;

    public LocalMediaStorage(IOptions<StorageOptions> options, ILogger<LocalMediaStorage> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<StorageUploadResult> SaveAsync(Stream stream, string fileName, string mimeType)
    {
        var storageKey = $"{Path.GetRandomFileName()}_{fileName}";
        var filePath = Path.Combine(_options.LocalRootPath, storageKey);

        try
        {
            Directory.CreateDirectory(_options.LocalRootPath);

            await using var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write);
            await stream.CopyToAsync(fileStream);

            var publicUrl = $"{_options.PublicBaseUrl.TrimEnd('/')}/{storageKey}";

            return new StorageUploadResult
            {
                StorageKey = storageKey,
                PublicUrl = publicUrl
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save file to local storage.");
            throw;
        }
    }

    public Task DeleteAsync(string storageKey)
    {
        var filePath = Path.Combine(_options.LocalRootPath, storageKey);

        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file from local storage.");
            throw;
        }

        return Task.CompletedTask;
    }
}
