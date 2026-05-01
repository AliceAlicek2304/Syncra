namespace Syncra.Application.Interfaces;

public interface IDistributedLockService
{
    /// <summary>
    /// Attempts to acquire a distributed lock. Returns a disposable handle if acquired, null if not.
    /// The lock auto-expires after the specified timeout.
    /// </summary>
    Task<IDistributedLock?> TryAcquireAsync(string key, TimeSpan timeout, CancellationToken cancellationToken = default);
}

public interface IDistributedLock : IAsyncDisposable
{
    bool IsAcquired { get; }
}
