
using System.IO;
using System.Threading.Tasks;
using Syncra.Application.DTOs;

namespace Syncra.Application.Interfaces;

public interface IStorageService
{
    Task<StorageUploadResult> SaveAsync(Stream stream, string fileName, string mimeType);
    Task DeleteAsync(string storageKey);
}
