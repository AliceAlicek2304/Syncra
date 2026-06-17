using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Posts;

public static class PostMapper
{
    public static PostDto ToDto(Post post, IStorageService storageService) =>
        new(
            post.Id,
            post.WorkspaceId,
            post.UserId,
            post.Title?.Value ?? string.Empty,
            post.Content?.Value ?? string.Empty,
            post.Status.ToString(),
            post.ScheduledAt?.UtcValue,
            post.PublishedAtUtc,
            post.Media.Select(m => m.Id).ToList(),
            post.Media.Select(m => new PostMediaItemDto(
                Url: storageService.GetPresignedUrl(m.FileUrl, 24),
                Type: m.MediaType,
                Filename: m.FileName,
                MimeType: m.MimeType)).ToList(),
            post.ZernioPostId,
            post.ZernioTargetCount,
            post.PlatformTargets?.Select(t => new PostPlatformTargetDto(
                t.Id,
                t.Platform,
                t.Status.ToString(),
                t.ExternalPostUrl,
                t.ErrorMessage,
                t.ZernioAccountId)).ToList() ?? new List<PostPlatformTargetDto>());

    public static PostDto ToDto(
        Guid workspaceId,
        string title,
        string content,
        string? zernioPostId,
        DateTime? scheduledAtUtc,
        bool isDraft) =>
        new(
            Id: Guid.Empty,
            WorkspaceId: workspaceId,
            UserId: Guid.Empty,
            Title: title,
            Content: content,
            Status: isDraft ? "Draft" : "Failed",
            ScheduledAtUtc: scheduledAtUtc,
            PublishedAtUtc: null,
            MediaIds: new List<Guid>(),
            MediaItems: new List<PostMediaItemDto>(),
            ZernioPostId: zernioPostId,
            ZernioTargetCount: 0,
            PlatformTargets: new List<PostPlatformTargetDto>());
}
