using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.UpdateZernioPost;

public sealed record UpdateZernioPostCommand(
    Guid WorkspaceId,
    Guid UserId,
    string? Title,
    string? Content,
    IReadOnlyList<Guid>? SocialAccountIds,
    DateTime? ScheduledAtUtc,
    bool PublishNow,
    bool? IsDraft,
    IReadOnlyList<PostMediaItemDto>? MediaItems,
    IReadOnlyList<PlatformContentDto>? PlatformContents,
    string PostId,
    Syncra.Application.DTOs.Zernio.AllPlatformDataDto? PlatformSpecificData = null,
    Syncra.Application.DTOs.Zernio.TikTokSettingsDto? TiktokSettings = null
) : IRequest<PostDto>;
