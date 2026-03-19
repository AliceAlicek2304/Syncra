namespace Syncra.Application.DTOs.AI;

public sealed record GenerateIdeasResponseDto(
    string Topic,
    IReadOnlyCollection<GeneratedIdeaDto> Ideas
);

public sealed record GeneratedIdeaDto(
    string Id,
    string Type,
    string Hook,
    string Title,
    string Caption,
    IReadOnlyCollection<string> Hashtags,
    IReadOnlyCollection<string> Platforms,
    string BestTime,
    string EstimatedReach
);
