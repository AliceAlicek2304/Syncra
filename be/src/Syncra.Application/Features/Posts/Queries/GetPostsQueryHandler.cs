using System.Security.Cryptography;
using System.Text;
using MediatR;
using Syncra.Application.DTOs;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.Queries;

public sealed class GetPostsQueryHandler : IRequestHandler<GetPostsQuery, PaginatedResult<PostDto>>
{
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;

    public GetPostsQueryHandler(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
    }

    public async Task<PaginatedResult<PostDto>> Handle(GetPostsQuery request, CancellationToken cancellationToken)
    {
        var profiles = await ResolveProfilesAsync(request, cancellationToken);
        if (profiles.Count == 0)
            return new PaginatedResult<PostDto>([], 1, request.PageSize, 0, 0);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 && request.PageSize <= 100 ? request.PageSize : 20;

        // Multi-profile: fetch enough from each to merge in memory
        int? fetchPage = profiles.Count > 1 ? 1 : page;
        int? fetchLimit = profiles.Count > 1 ? page * pageSize : pageSize;

        var tasks = profiles.Select(p => _zernioClient.ListPostsAsync(
            profileId: p.ZernioProfileId,
            page: fetchPage,
            limit: fetchLimit,
            status: request.Status?.ToLowerInvariant(),
            sortBy: "scheduled-desc",
            dateFrom: request.ScheduledFromUtc,
            dateTo: request.ScheduledToUtc,
            cancellationToken: cancellationToken));

        var results = await Task.WhenAll(tasks);

        if (profiles.Count == 1)
        {
            var single = results[0];
            var singleItems = single.Posts.Select(p => MapToDto(p, request.WorkspaceId)).ToList();
            return new PaginatedResult<PostDto>(
                Items: singleItems,
                Page: single.Page,
                PageSize: single.Limit,
                TotalItems: single.Total,
                TotalPages: single.Pages);
        }

        // Merge all posts, deduplicate by Zernio post ID, sort by scheduled-desc, then paginate
        var allPosts = results
            .SelectMany(r => r.Posts)
            .GroupBy(p => p.Id)
            .Select(g => g.First())
            .OrderByDescending(p => p.ScheduledFor ?? DateTime.MinValue)
            .ToList();

        var totalItems = allPosts.Count;
        var totalPages = (int)Math.Ceiling((double)totalItems / pageSize);
        var pagedPosts = allPosts
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedPosts.Select(p => MapToDto(p, request.WorkspaceId)).ToList();

        return new PaginatedResult<PostDto>(
            Items: items,
            Page: page,
            PageSize: pageSize,
            TotalItems: totalItems,
            TotalPages: totalPages);
    }

    private async Task<IReadOnlyList<Domain.Entities.ZernioProfile>> ResolveProfilesAsync(
        GetPostsQuery request, CancellationToken cancellationToken)
    {
        if (request.ProfileId.HasValue)
        {
            var profile = await _zernioProfileRepository.GetByIdAsync(request.ProfileId.Value, cancellationToken);
            return profile is not null ? [profile] : [];
        }

        return await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(request.WorkspaceId);
    }

    private static PostDto MapToDto(ZernioPostListItemDto zp, Guid workspaceId)
    {
        return new PostDto(
            Id: ObjectIdToGuid(zp.Id),
            WorkspaceId: workspaceId,
            UserId: Guid.Empty,
            Title: zp.Title ?? string.Empty,
            Content: zp.Content,
            Status: zp.Status,
            ScheduledAtUtc: zp.ScheduledFor,
            PublishedAtUtc: zp.PublishedAt,
            MediaIds: (zp.ZernioMediaItems ?? []).Select(m => ObjectIdToGuid(m.Id)).ToList(),
            MediaItems: (zp.ZernioMediaItems ?? []).Select(m => new PostMediaItemDto(
                Url: m.Url,
                Type: m.Type,
                Filename: m.Filename,
                MimeType: m.MimeType)).ToList(),
            ZernioPostId: zp.Id,
            ZernioTargetCount: zp.Platforms.Count,
            PlatformTargets: zp.Platforms
                .Select(pt => new PostPlatformTargetDto(
                    Id: Guid.Empty,
                    Platform: pt.Platform,
                    Status: pt.Status,
                    ExternalPostUrl: pt.PlatformPostUrl,
                    ErrorMessage: pt.ErrorMessage,
                    ZernioAccountId: pt.AccountId,
                    PlatformSpecificData: pt.PlatformSpecificData))
                .ToList()
        );
    }

    private static Guid ObjectIdToGuid(string objectId)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(objectId));
        return new Guid(bytes);
    }
}