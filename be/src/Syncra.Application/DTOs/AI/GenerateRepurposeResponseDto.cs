namespace Syncra.Application.DTOs.AI;

public sealed record GenerateRepurposeResponseDto(
    IReadOnlyCollection<RepurposeAtomDto> Atoms
);

public sealed record RepurposeAtomDto(
    string Id,
    string Type,
    string? Title,
    string Content,
    string Platform,
    IReadOnlyCollection<string> SuggestedHashtags,
    string? SuggestedCta
);
