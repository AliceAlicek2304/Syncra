using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Enums;

namespace Syncra.Application.Features.Posts.Queries;

public sealed class GetPostsQueryHandler : IRequestHandler<GetPostsQuery, IReadOnlyList<PostDto>>
{
    private readonly IPostRepository _postRepository;

    public GetPostsQueryHandler(IPostRepository postRepository)
    {
        _postRepository = postRepository;
    }

    public async Task<IReadOnlyList<PostDto>> Handle(GetPostsQuery request, CancellationToken cancellationToken)
    {
        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 && request.PageSize <= 100 ? request.PageSize : 20;

        // Parse status filter
        PostStatus? status = null;
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<PostStatus>(request.Status, ignoreCase: true, out var parsedStatus))
        {
            status = parsedStatus;
        }

        // Use database-level filtering via repository
        var (items, _) = await _postRepository.GetFilteredAsync(
            request.WorkspaceId,
            status,
            request.ScheduledFromUtc,
            request.ScheduledToUtc,
            page,
            pageSize,
            cancellationToken);

        return items.Select(PostMapper.ToDto).ToList();
    }
}