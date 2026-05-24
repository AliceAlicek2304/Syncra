using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Jobs;

public sealed class CancelScheduledPostsForDisconnectedAccountJob
{
    private const string CacheKeyPrefix = "disconnect_grace:";

    private readonly AppDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly ILogger<CancelScheduledPostsForDisconnectedAccountJob> _logger;

    public CancelScheduledPostsForDisconnectedAccountJob(
        AppDbContext db,
        IDistributedCache cache,
        ILogger<CancelScheduledPostsForDisconnectedAccountJob> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task ExecuteAsync(
        Guid socialAccountId,
        string graceToken,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"{CacheKeyPrefix}{socialAccountId}";
        var currentToken = await _cache.GetStringAsync(cacheKey, cancellationToken);
        if (string.IsNullOrWhiteSpace(currentToken) || currentToken != graceToken)
        {
            return;
        }

        var account = await _db.SocialAccounts
            .FirstOrDefaultAsync(sa => sa.Id == socialAccountId, cancellationToken);

        if (account is null || account.IsActive)
        {
            await _cache.RemoveAsync(cacheKey, cancellationToken);
            return;
        }

        var scheduledPosts = await _db.Posts
            .Include(p => p.PlatformTargets)
            .Where(p =>
                p.WorkspaceId == account.WorkspaceId
                && p.Status == PostStatus.Scheduled
                && p.PlatformTargets.Any(t => t.ZernioAccountId == account.ExternalAccountId))
            .ToListAsync(cancellationToken);

        var cancelledCount = 0;
        foreach (var post in scheduledPosts)
        {
            if (!post.PlatformTargets.All(t => t.ZernioAccountId == account.ExternalAccountId))
            {
                continue;
            }

            try
            {
                post.Unschedule();
                cancelledCount++;
            }
            catch (DomainException)
            {
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _cache.RemoveAsync(cacheKey, cancellationToken);

        _logger.LogInformation(
            "Cancelled {CancelledCount} scheduled posts after grace period for disconnected SocialAccount {AccountId} in workspace {WorkspaceId}.",
            cancelledCount,
            socialAccountId,
            account.WorkspaceId);
    }
}
