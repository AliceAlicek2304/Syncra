using Syncra.Application.DTOs.Repurpose;
using Syncra.Domain.Common;

namespace Syncra.Application.Interfaces;

/// <summary>
/// Service for repurposing content across multiple social platforms.
/// Transforms source text into platform-optimized content variants.
/// </summary>
public interface IRepurposeService
{
    /// <summary>
    /// Generates repurposed content atoms for the specified platforms.
    /// </summary>
    Task<Result<RepurposeResult>> GenerateAsync(
        RepurposeRequest request,
        CancellationToken cancellationToken = default);

    IAsyncEnumerable<RepurposeStreamEvent> GenerateStreamAsync(
        Guid workspaceId,
        RepurposeRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<RepurposeResult>> GetSessionAsync(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RepurposeSessionSummary>> GetSessionsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteSessionAsync(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken = default);
}
