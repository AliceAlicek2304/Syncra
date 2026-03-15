namespace Syncra.Application.Interfaces;

/// <summary>
/// Thin cache abstraction for analytics — keeps Application layer free of infrastructure dependencies.
/// </summary>
public interface IAnalyticsCache
{
    Task<string?> GetAsync(string key, CancellationToken cancellationToken = default);
    Task SetAsync(string key, string value, TimeSpan ttl, CancellationToken cancellationToken = default);
}
