using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Posts;

public static class PostMapper
{
    public static PostDto ToDto(Post post) =>
        new(
            post.Id,
            post.WorkspaceId,
            post.UserId,
            post.Title.Value,
            post.Content.Value,
            post.Status.ToString(),
            post.ScheduledAt.UtcValue,
            post.PublishedAtUtc,
            post.IntegrationId,
            post.Media.Select(m => m.Id).ToList());
}