using System.Runtime.CompilerServices;
using System.Text;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.AI;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;

namespace Syncra.Infrastructure.Services;

public sealed class GeminiProvider : IAIProvider
{
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiProvider> _logger;
    private const int MaxRetries = 3;

    public string ProviderKey => "gemini";

    public GeminiProvider(
        IOptions<GeminiOptions> options,
        ILogger<GeminiProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async IAsyncEnumerable<AIStreamEvent> GenerateStreamAsync(
        string systemPrompt,
        string userPrompt,
        AIProviderOptions? aiOptions = null,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var model = aiOptions?.Model ?? _options.Model;
            var temperature = (float)(aiOptions?.Temperature ?? (float)_options.Temperature);
        var maxOutputTokens = aiOptions?.MaxOutputTokens ?? _options.MaxOutputTokens;

        for (var attempt = 0; attempt <= MaxRetries; attempt++)
        {
            ct.ThrowIfCancellationRequested();
            if (attempt > 0)
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt - 1)), ct);

            var hasError = false;
            var enumerator = StreamFromGeminiAsync(systemPrompt, userPrompt, model, temperature, maxOutputTokens, ct).GetAsyncEnumerator(ct);
            await using (enumerator)
            {
                while (true)
                {
                    bool hasNext;
                    try
                    {
                        hasNext = await enumerator.MoveNextAsync();
                    }
                    catch (OperationCanceledException) { throw; }
                    catch (Exception ex) when (attempt < MaxRetries && ex is not Google.GenAI.ClientError)
                    {
                        _logger.LogWarning(ex, "Gemini API call failed (attempt {Attempt}/{MaxRetries})", attempt + 1, MaxRetries);
                        hasError = true;
                        break;
                    }

                    if (!hasNext) break;
                    yield return enumerator.Current;
                }
            }

            if (!hasError) yield break;
        }

        yield return new ErrorEvent("api_unavailable", "Failed to reach Gemini API after retries");
    }

    private async IAsyncEnumerable<AIStreamEvent> StreamFromGeminiAsync(
        string systemPrompt,
        string userPrompt,
        string model,
        float temperature,
        int maxOutputTokens,
        [EnumeratorCancellation] CancellationToken ct)
    {
        await using var client = new Client(apiKey: _options.ApiKey);

        var config = new GenerateContentConfig
        {
            SystemInstruction = new Content
            {
                Parts = new List<Part> { new Part { Text = systemPrompt } }
            },
            Temperature = temperature,
            MaxOutputTokens = maxOutputTokens,
            ResponseMimeType = "application/json",
            SafetySettings =
            [
                new SafetySetting { Category = HarmCategory.HarmCategoryHarassment, Threshold = HarmBlockThreshold.BlockMediumAndAbove },
                new SafetySetting { Category = HarmCategory.HarmCategoryHateSpeech, Threshold = HarmBlockThreshold.BlockMediumAndAbove },
                new SafetySetting { Category = HarmCategory.HarmCategorySexuallyExplicit, Threshold = HarmBlockThreshold.BlockMediumAndAbove },
                new SafetySetting { Category = HarmCategory.HarmCategoryDangerousContent, Threshold = HarmBlockThreshold.BlockMediumAndAbove },
            ]
        };

        var fullOutput = new StringBuilder();
        var promptTokens = 0;
        var completionTokens = 0;

        await foreach (var chunk in client.Models.GenerateContentStreamAsync(
            model: model,
            contents: userPrompt,
            config: config,
            cancellationToken: ct))
        {
            ct.ThrowIfCancellationRequested();

            if (chunk.Candidates is null || chunk.Candidates.Count == 0)
                continue;

            var candidate = chunk.Candidates[0];

            if (chunk.PromptFeedback?.BlockReason is not null)
            {
                yield return new ErrorEvent("content_safety", $"Content blocked: {chunk.PromptFeedback.BlockReason}");
                yield break;
            }

            if (candidate.FinishReason == FinishReason.Safety)
            {
                yield return new ErrorEvent("content_safety", "Content was blocked by safety filters");
                yield break;
            }

            if (candidate.Content?.Parts is not null)
            {
                foreach (var part in candidate.Content.Parts)
                {
                    if (part?.Text is not null)
                    {
                        fullOutput.Append(part.Text);
                        yield return new TokenEvent(part.Text);
                    }
                }
            }

            if (chunk.UsageMetadata is not null)
            {
                promptTokens = chunk.UsageMetadata.PromptTokenCount ?? 0;
                completionTokens = chunk.UsageMetadata.CandidatesTokenCount ?? 0;
            }
        }

        var output = fullOutput.ToString();
        if (string.IsNullOrWhiteSpace(output))
        {
            yield return new ErrorEvent("empty_response", "Gemini returned empty response");
            yield break;
        }

        yield return new CompleteEvent(output, promptTokens, completionTokens);
    }
}
