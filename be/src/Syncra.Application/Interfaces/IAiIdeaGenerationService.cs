using Syncra.Application.DTOs.AI;

namespace Syncra.Application.Interfaces;

public interface IAiIdeaGenerationService
{
    Task<GenerateIdeasResponseDto> GenerateIdeasAsync(
        Guid workspaceId,
        Guid userId,
        GenerateIdeasRequestDto request,
        CancellationToken cancellationToken = default);

    Task<GenerateRepurposeResponseDto> GenerateRepurposeAsync(
        Guid workspaceId,
        Guid userId,
        GenerateRepurposeRequestDto request,
        CancellationToken cancellationToken = default);

    Task<AssistContentResponseDto> AssistContentAsync(
        Guid workspaceId,
        Guid userId,
        AssistContentRequestDto request,
        CancellationToken cancellationToken = default);
}
