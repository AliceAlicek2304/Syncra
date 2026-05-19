using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.Posts;

public record CreatePostDto(
    [Required, MaxLength(200)] string Title,
    [Required] string Content,
    DateTime? ScheduledAtUtc,
    Guid? IntegrationId,
    string? TargetPageId,
    IReadOnlyCollection<Guid>? MediaIds
);

