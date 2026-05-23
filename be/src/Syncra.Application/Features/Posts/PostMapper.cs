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
            post.Media.Select(m => m.Id).ToList(),
            post.ZernioPostId,
            post.ZernioTargetCount,
            post.PlatformTargets?.Select(t => new PostPlatformTargetDto(
                t.Id,
                t.Platform,
                t.Status.ToString(),
                t.ExternalPostUrl,
                t.ErrorMessage,
                t.ZernioAccountId)).ToList() ?? new List<PostPlatformTargetDto>());
}
