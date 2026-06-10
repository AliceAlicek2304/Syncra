using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure.Services;

public sealed class RepurposeCacheService : IRepurposeCache
{
    private readonly IDistributedCache _cache;
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public RepurposeCacheService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<RepurposeResult?> GetAsync(string cacheKey, CancellationToken ct = default)
    {
        var data = await _cache.GetStringAsync(cacheKey, ct);
        if (string.IsNullOrEmpty(data)) return null;
        return JsonSerializer.Deserialize<RepurposeResult>(data, _jsonOptions);
    }

    public async Task SetAsync(string cacheKey, RepurposeResult result, TimeSpan ttl, CancellationToken ct = default)
    {
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl
        };
        var data = JsonSerializer.Serialize(result, _jsonOptions);
        await _cache.SetStringAsync(cacheKey, data, options, ct);
    }
}
