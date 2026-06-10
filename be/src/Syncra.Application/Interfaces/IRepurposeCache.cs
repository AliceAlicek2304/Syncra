using Syncra.Application.DTOs.Repurpose;

namespace Syncra.Application.Interfaces;

public interface IRepurposeCache
{
    Task<RepurposeResult?> GetAsync(string cacheKey, CancellationToken ct = default);
    Task SetAsync(string cacheKey, RepurposeResult result, TimeSpan ttl, CancellationToken ct = default);
}
