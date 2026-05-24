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
}
