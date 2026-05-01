using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure.Services;

public sealed class RedisDistributedLockService : IDistributedLockService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisDistributedLockService> _logger;

    public RedisDistributedLockService(
        IConnectionMultiplexer? redis,
        ILogger<RedisDistributedLockService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<IDistributedLock?> TryAcquireAsync(string key, TimeSpan timeout, CancellationToken cancellationToken = default)
    {
        if (_redis == null || !_redis.IsConnected)
        {
            _logger.LogDebug("Redis not available — skipping distributed lock for {Key}", key);
            return new NoOpLock();
        }

        var db = _redis.GetDatabase();
        var lockValue = Guid.NewGuid().ToString();

        try
        {
            var acquired = await db.StringSetAsync(key, lockValue, timeout, When.NotExists);
            if (!acquired)
            {
                _logger.LogDebug("Lock not acquired for {Key} — another instance is processing", key);
                return null;
            }

            return new RedisLock(db, key, lockValue, _logger);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis lock acquisition failed for {Key} — proceeding without lock", key);
            return new NoOpLock();
        }
    }
}

internal sealed class RedisLock : IDistributedLock
{
    private readonly IDatabase _db;
    private readonly string _key;
    private readonly string _value;
    private readonly ILogger _logger;
    private bool _disposed;

    public bool IsAcquired => true;

    public RedisLock(IDatabase db, string key, string value, ILogger logger)
    {
        _db = db;
        _key = key;
        _value = value;
        _logger = logger;
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        try
        {
            const string script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
            await _db.ScriptEvaluateAsync(script, new RedisKey[] { _key }, new RedisValue[] { _value });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to release Redis lock for {Key} — it will auto-expire", _key);
        }
    }
}

internal sealed class NoOpLock : IDistributedLock
{
    public bool IsAcquired => true;
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
