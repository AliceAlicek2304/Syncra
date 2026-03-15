using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.Queries;

public record GetPostsQuery(
    Guid WorkspaceId,
    string? Status = null,
    DateTime? ScheduledFromUtc = null,
    DateTime? ScheduledToUtc = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<IReadOnlyList<PostDto>>;