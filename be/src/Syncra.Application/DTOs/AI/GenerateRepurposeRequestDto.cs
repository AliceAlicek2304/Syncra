using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.AI;

public sealed record GenerateRepurposeRequestDto(
    [Required, MinLength(5)] string SourceText,
    [Required, MinLength(1)] IReadOnlyCollection<string> Platforms,
    [MaxLength(50)] string? Tone,
    bool ExtractAtoms,
    [MaxLength(20)] string? Length = "medium"
);
