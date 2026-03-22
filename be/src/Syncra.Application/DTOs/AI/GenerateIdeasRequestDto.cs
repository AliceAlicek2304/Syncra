using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.AI;

public sealed record GenerateIdeasRequestDto(
    [Required, MaxLength(500)] string Topic,
    [MaxLength(200)] string? Niche,
    [MaxLength(200)] string? Audience,
    [MaxLength(100)] string? Goal,
    [MaxLength(50)] string? Tone,
    [Range(1, 10)] int Count = 5,
    IReadOnlyCollection<AiReferenceFileDto>? Files = null
);

public sealed record AiReferenceFileDto(
    [MaxLength(200)] string Name,
    [MaxLength(50)] string Type,
    [MaxLength(500)] string? Caption
);
