using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Interfaces;

public interface IInboxCommentListCacheService
{
    Task<ZernioInboxCommentsPageDto?> GetAsync(
        Guid workspaceId,
        string? cursor,
        int? minComments,
        DateTime? since,
        string? sortBy,
        string? sortOrder,
        string? platform,
        string? accountId,
        string? profileId = null,
        CancellationToken cancellationToken = default);

    Task SetAsync(
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
        CancellationToken cancellationToken = default);

    Task InvalidateAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default);
}
