using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.Posts;

public record UpdatePostDto(
    [Required, MaxLength(200)] string Title,
    [Required] string Content,
    DateTime? ScheduledAtUtc,
    string? Status,
    Guid? IntegrationId,
    IReadOnlyCollection<Guid>? MediaIds
);

