using System.Collections.Concurrent;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure.Services;

/// <summary>
/// In-process cache for Zernio inbox-comments list responses (D-15).
/// Keyed by (workspaceId, cursor, minComments, since, sortBy, sortOrder, platform, accountId).
/// Each entry is invalidated by its own TTL — there is no global invalidation, so backfill
/// updates are not visible until the TTL expires. For pre-warm flows, callers may overwrite
/// the entry via <see cref="SetAsync"/>.
/// </summary>
public sealed class InMemoryInboxCommentListCacheService : IInboxCommentListCacheService
{
    private readonly ConcurrentDictionary<string, Entry> _cache = new();
    public Task<ZernioInboxCommentsPageDto?> GetAsync(
        Guid workspaceId,
        string? cursor,
        int? minComments,
        DateTime? since,
        string? sortBy,
        string? sortOrder,
        string? platform,
        string? accountId,
        string? profileId = null,
        CancellationToken cancellationToken = default)
    {
        var key = BuildKey(workspaceId, cursor, minComments, since, sortBy, sortOrder, platform, accountId, profileId);

        if (_cache.TryGetValue(key, out var entry) && entry.ExpiresAtUtc > DateTime.UtcNow)
        {
            return Task.FromResult<ZernioInboxCommentsPageDto?>(entry.Page);
        }

        if (entry != null)
        {
            _cache.TryRemove(key, out _);
        }

        return Task.FromResult<ZernioInboxCommentsPageDto?>(null);
    }

    public Task SetAsync(
        Guid workspaceId,
        ZernioInboxCommentsPageDto page,
        string? cursor,
        int? minComments,
        DateTime? since,
        string? sortBy,
        string? sortOrder,
        string? platform,
        string? accountId,
        TimeSpan ttl,
        string? profileId = null,
        CancellationToken cancellationToken = default)
    {
        var key = BuildKey(workspaceId, cursor, minComments, since, sortBy, sortOrder, platform, accountId, profileId);
        var entry = new Entry(page, DateTime.UtcNow.Add(ttl));
        _cache[key] = entry;
        return Task.CompletedTask;
    }

    public Task InvalidateAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        var prefix = workspaceId.ToString("N") + "|";
        var keysToRemove = _cache.Keys.Where(k => k.StartsWith(prefix)).ToList();
        foreach (var key in keysToRemove)
        {
            _cache.TryRemove(key, out _);
        }
        return Task.CompletedTask;
    }

    private static string BuildKey(
        Guid workspaceId,
        string? cursor,
        int? minComments,
        DateTime? since,
        string? sortBy,
        string? sortOrder,
        string? platform,
        string? accountId,
        string? profileId)
    {
        return string.Join("|",
            workspaceId.ToString("N"),
            cursor ?? string.Empty,
            minComments?.ToString() ?? string.Empty,
            since?.ToString("O") ?? string.Empty,
            sortBy ?? string.Empty,
            sortOrder ?? string.Empty,
            platform ?? string.Empty,
            accountId ?? string.Empty,
            profileId ?? string.Empty);
    }

    private sealed record Entry(ZernioInboxCommentsPageDto Page, DateTime ExpiresAtUtc);
}
