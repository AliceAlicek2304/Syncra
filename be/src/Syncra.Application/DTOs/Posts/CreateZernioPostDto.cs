using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.Posts;

public record CreateZernioPostDto(
    [MaxLength(200)] string? Title,
    string? Content,
    IReadOnlyList<Guid>? SocialAccountIds,
    DateTime? ScheduledAtUtc,
    bool PublishNow,
    bool? IsDraft,
    IReadOnlyList<PostMediaItemDto>? MediaItems,
    IReadOnlyList<PlatformContentDto>? PlatformContents,
    string? PostId = null,
    Syncra.Application.DTOs.Zernio.AllPlatformDataDto? PlatformSpecificData = null,
    Syncra.Application.DTOs.Zernio.TikTokSettingsDto? TiktokSettings = null
);

public record PlatformContentDto(
    string Platform,
    string Caption
);
