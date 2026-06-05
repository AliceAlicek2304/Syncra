using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxCommentsQueryHandler
    : IRequestHandler<GetInboxCommentsQuery, InboxCommentedPostsResponseDto>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly IInboxRepository _inboxRepository;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IInboxCommentListCacheService _listCache;
    private readonly IZernioProfileRepository _profileRepository;

    public GetInboxCommentsQueryHandler(
        IInboxRepository inboxRepository,
        ISocialAccountRepository socialAccountRepository,
        IZernioClient zernioClient,
        IInboxCommentListCacheService listCache,
        IZernioProfileRepository profileRepository)
    {
        _inboxRepository = inboxRepository;
        _socialAccountRepository = socialAccountRepository;
        _zernioClient = zernioClient;
        _listCache = listCache;
        _profileRepository = profileRepository;
    }

    public async Task<InboxCommentedPostsResponseDto> Handle(
        GetInboxCommentsQuery request,
        CancellationToken cancellationToken)
    {
        var limit = request.Limit;

        var profileId = request.ProfileId;
        if (string.IsNullOrEmpty(profileId))
        {
            var profile = await _profileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
            profileId = profile?.ZernioProfileId;
        }

        if (string.IsNullOrEmpty(profileId))
        {
            return await ReadFromLocalDbAsync(request, limit, cancellationToken);
        }

        var cached = await _listCache.GetAsync(
            request.WorkspaceId,
            request.Cursor,
            request.MinComments,
            request.Since,
            request.SortBy,
            request.SortOrder,
            request.Platform,
            request.AccountId,
            cancellationToken);

        if (cached != null)
        {
            return await MapLivePageToResponseAsync(cached, request, cancellationToken);
        }

        var live = await _zernioClient.ListInboxCommentsAsync(
            profileId,
            request.Since,
            request.Cursor,
            request.Platform,
            request.AccountId,
            request.MinComments,
            request.SortBy,
            request.SortOrder,
            limit,
            cancellationToken);

        await _listCache.SetAsync(
            request.WorkspaceId,
            live,
            request.Cursor,
            request.MinComments,
            request.Since,
            request.SortBy,
            request.SortOrder,
            request.Platform,
            request.AccountId,
            CacheTtl,
            cancellationToken);

        return await MapLivePageToResponseAsync(live, request, cancellationToken);
    }

    private static bool NeedsLiveFetch(GetInboxCommentsQuery q) =>
        q.MinComments.HasValue
        || q.Since.HasValue
        || !string.IsNullOrEmpty(q.SortBy)
        || !string.IsNullOrEmpty(q.SortOrder);

    private async Task<InboxCommentedPostsResponseDto> ReadFromLocalDbAsync(
        GetInboxCommentsQuery request,
        int limit,
        CancellationToken cancellationToken)
    {
        var posts = await _inboxRepository.GetCommentedPostsAsync(
            request.WorkspaceId,
            limit + 1,
            before: null,
            request.Platform,
            request.AccountId,
            cancellationToken);

        var hasMore = posts.Count > limit;
        var itemsToReturn = posts.Take(limit).ToList();

        string? nextCursor = null;
        if (hasMore && itemsToReturn.Count > 0)
        {
            nextCursor = itemsToReturn[^1].ReceivedAtUtc.ToString("O");
        }

        var mappedItems = itemsToReturn.Select(c => new InboxCommentedPostItemDto(
            c.ZernioPostId,
            c.Platform,
            c.ZernioAccountId,
            c.AccountUsername,
            c.PostPreviewThumbnailUrl,
            c.Permalink,
            c.ReceivedAtUtc,
            c.CommentCount,
            c.LikeCount,
            c.ZernioTopCommentId,
            c.Subreddit,
            c.IsAd,
            c.AdId,
            c.Placement
        )).ToList();

        var socialAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        var activeAccountsCount = socialAccounts.Count(sa => sa.IsActive);

        var meta = new ZernioInboxCommentMetaDto(
            AccountsQueried: activeAccountsCount,
            AccountsFailed: 0,
            FailedAccounts: Array.Empty<ZernioInboxFailedAccountDto>(),
            LastUpdated: DateTime.UtcNow
        );

        return new InboxCommentedPostsResponseDto(
            mappedItems,
            new InboxPageMetadata(hasMore, nextCursor),
            meta);
    }

    private static async Task<InboxCommentedPostsResponseDto> MapLivePageToResponseAsync(
        ZernioInboxCommentsPageDto live,
        GetInboxCommentsQuery request,
        CancellationToken cancellationToken)
    {
        var mappedItems = live.Items
            .Select(item => new InboxCommentedPostItemDto(
                item.Id,
                item.Platform,
                item.AccountId,
                item.AccountUsername,
                item.Picture,
                item.Permalink,
                item.CreatedTime,
                item.CommentCount,
                item.LikeCount,
                item.Cid,
                item.Subreddit,
                item.IsAd,
                item.AdId,
                item.Placement))
            .ToList();

        var meta = new ZernioInboxCommentMetaDto(
            AccountsQueried: live.Meta?.AccountsQueried ?? 0,
            AccountsFailed: live.Meta?.AccountsFailed ?? 0,
            FailedAccounts: live.Meta?.FailedAccounts ?? Array.Empty<ZernioInboxFailedAccountDto>(),
            LastUpdated: live.Meta?.LastUpdated ?? DateTime.UtcNow
        );

        return await Task.FromResult(new InboxCommentedPostsResponseDto(
            mappedItems,
            new InboxPageMetadata(live.HasMore, live.NextCursor),
            meta));
    }
}
