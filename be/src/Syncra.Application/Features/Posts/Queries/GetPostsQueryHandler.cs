using System.Security.Cryptography;
using System.Text;
using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.Queries;

public sealed class GetPostsQueryHandler : IRequestHandler<GetPostsQuery, IReadOnlyList<PostDto>>
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

    public async Task<IReadOnlyList<PostDto>> Handle(GetPostsQuery request, CancellationToken cancellationToken)
    {
        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile is null)
            return Array.Empty<PostDto>();

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 && request.PageSize <= 100 ? request.PageSize : 20;

        var result = await _zernioClient.ListPostsAsync(
            profile.ZernioProfileId,
            page: page,
            limit: pageSize,
            status: request.Status?.ToLowerInvariant(),
            sortBy: "scheduled-desc",
            cancellationToken: cancellationToken);

        return result.Posts.Select(MapToDto).ToList();
    }

    private static PostDto MapToDto(ZernioPostListItemDto zp)
    {
        return new PostDto(
            Id: ObjectIdToGuid(zp.Id),
            WorkspaceId: Guid.Empty,
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
                    ZernioAccountId: pt.AccountId))
                .ToList()
        );
    }

    private static Guid ObjectIdToGuid(string objectId)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(objectId));
        return new Guid(bytes);
    }
}