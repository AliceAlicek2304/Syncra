using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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
        var targetProfiles = new List<ZernioProfile>();

        if (!string.IsNullOrEmpty(profileId) && profileId != "all")
        {
            if (Guid.TryParse(profileId, out var profileGuid))
            {
                var profile = await _profileRepository.GetByIdAsync(profileGuid, cancellationToken);
                if (profile != null)
                {
                    targetProfiles.Add(profile);
                }
            }
            else
            {
                var allActive = await _profileRepository.GetAllActiveAsync();
                var matched = allActive.FirstOrDefault(p => p.ZernioProfileId == profileId);
                if (matched != null)
                {
                    targetProfiles.Add(matched);
                }
            }
        }
        else
        {
            var activeProfiles = await _profileRepository.GetActiveByWorkspaceIdAsync(request.WorkspaceId);
            if (activeProfiles != null)
            {
                targetProfiles.AddRange(activeProfiles);
            }
        }

        if (!targetProfiles.Any())
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
            profileId: request.ProfileId,
            cancellationToken: cancellationToken);

        if (cached != null)
        {
            return await MapLivePageToResponseAsync(cached, request, cancellationToken);
        }

        // Fetch comments in parallel for all target profiles
        var fetchTasks = targetProfiles.Select(async profile =>
        {
            try
            {
                var page = await _zernioClient.ListInboxCommentsAsync(
                    profile.ZernioProfileId,
                    request.Since,
                    request.Cursor,
                    request.Platform,
                    request.AccountId,
                    request.MinComments,
                    request.SortBy,
                    request.SortOrder,
                    limit,
                    cancellationToken);
                return page;
            }
            catch (Exception)
            {
                return null;
            }
        });

        var fetchResults = await Task.WhenAll(fetchTasks);

        var allItems = new List<ZernioInboxCommentItemDto>();
        var failedAccounts = new List<ZernioInboxFailedAccountDto>();
        int accountsQueried = 0;
        int accountsFailed = 0;
        bool hasMore = false;

        foreach (var page in fetchResults)
        {
            if (page == null) continue;
            
            allItems.AddRange(page.Items);
            if (page.HasMore)
            {
                hasMore = true;
            }

            if (page.Meta != null)
            {
                accountsQueried += page.Meta.AccountsQueried;
                accountsFailed += page.Meta.AccountsFailed;
                if (page.Meta.FailedAccounts != null)
                {
                    failedAccounts.AddRange(page.Meta.FailedAccounts);
                }
            }
        }

        var sortedItems = allItems.OrderByDescending(item => item.CreatedTime).ToList();
        var paginatedItems = sortedItems.Take(limit).ToList();

        string? nextCursor = null;
        if ((hasMore || sortedItems.Count > limit) && paginatedItems.Any())
        {
            nextCursor = paginatedItems[^1].CreatedTime.ToString("O");
        }

        var meta = new ZernioInboxCommentMetaDto(
            AccountsQueried: accountsQueried,
            AccountsFailed: accountsFailed,
            FailedAccounts: failedAccounts,
            LastUpdated: DateTime.UtcNow
        );

        var mergedPage = new ZernioInboxCommentsPageDto(
            Items: paginatedItems,
            HasMore: hasMore || sortedItems.Count > limit,
            NextCursor: nextCursor,
            Meta: meta
        );

        await _listCache.SetAsync(
            request.WorkspaceId,
            mergedPage,
            request.Cursor,
            request.MinComments,
            request.Since,
            request.SortBy,
            request.SortOrder,
            request.Platform,
            request.AccountId,
            CacheTtl,
            profileId: request.ProfileId,
            cancellationToken: cancellationToken);

        return await MapLivePageToResponseAsync(mergedPage, request, cancellationToken);
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
            c.PostPreviewCaption,
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
                item.Content,
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
