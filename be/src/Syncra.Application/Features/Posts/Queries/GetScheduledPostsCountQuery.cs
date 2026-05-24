using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.Queries;

public record GetScheduledPostsCountQuery(
    Guid WorkspaceId,
    Guid SocialAccountId
) : IRequest<ScheduledPostsCountDto>;
