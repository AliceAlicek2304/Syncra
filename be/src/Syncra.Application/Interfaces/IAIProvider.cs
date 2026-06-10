using Syncra.Application.DTOs.AI;

namespace Syncra.Application.Interfaces;

public interface IAIProvider
{
    string ProviderKey { get; }
    IAsyncEnumerable<AIStreamEvent> GenerateStreamAsync(
        string systemPrompt,
        string userPrompt,
        AIProviderOptions? options = null,
        CancellationToken ct = default);
}

public sealed record AIProviderOptions(
    string? Model = null,
    double? Temperature = null,
    int? MaxOutputTokens = null);
