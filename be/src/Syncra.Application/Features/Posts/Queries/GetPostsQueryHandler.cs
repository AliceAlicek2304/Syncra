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
        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile is null)
            return new PaginatedResult<PostDto>([], 1, request.PageSize, 0, 0);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 && request.PageSize <= 100 ? request.PageSize : 20;

        var result = await _zernioClient.ListPostsAsync(
            page: page,
            limit: pageSize,
            status: request.Status?.ToLowerInvariant(),
            sortBy: "scheduled-desc",
            dateFrom: request.ScheduledFromUtc,
            dateTo: request.ScheduledToUtc,
            cancellationToken: cancellationToken);

        var items = result.Posts.Select(p => MapToDto(p, request.WorkspaceId)).ToList();

        return new PaginatedResult<PostDto>(
            Items: items,
            Page: result.Page,
            PageSize: result.Limit,
            TotalItems: result.Total,
            TotalPages: result.Pages);
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
            IntegrationId: null,
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