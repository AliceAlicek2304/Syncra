using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure.Services;

public sealed class AnalyticsCacheService : IAnalyticsCache
{
    private readonly IDistributedCache _cache;

    public AnalyticsCacheService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<string?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        try { return await _cache.GetStringAsync(key, cancellationToken); }
        catch { return null; }
    }

    public async Task SetAsync(string key, string value, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        try
        {
            await _cache.SetStringAsync(key, value, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            }, cancellationToken);
        }
        catch { /* cache failures are non-fatal */ }
    }
}
