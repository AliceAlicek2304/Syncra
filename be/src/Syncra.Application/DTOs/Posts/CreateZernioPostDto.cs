using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.Posts;

public record CreateZernioPostDto(
    [Required, MaxLength(200)] string Title,
    [Required] string Content,
    [Required, MinLength(1)] IReadOnlyList<Guid> SocialAccountIds,
    DateTime? ScheduledAtUtc,
    bool PublishNow
);
