using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.AI;

public sealed record FetchUrlContentRequestDto(
    [Required, Url, MaxLength(2000)] string Url
);

public sealed record FetchUrlContentResponseDto(
    string Content,
    string? Title
);
