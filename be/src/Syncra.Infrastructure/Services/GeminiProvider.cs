using System.Runtime.CompilerServices;
using System.Text;
using System.IO;
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
    private readonly IStorageService _storageService;
    private readonly ILogger<GeminiProvider> _logger;
    private const int MaxRetries = 3;

    public string ProviderKey => "gemini";

    public GeminiProvider(
        IOptions<GeminiOptions> options,
        IStorageService storageService,
        ILogger<GeminiProvider> logger)
    {
        _options = options.Value;
        _storageService = storageService;
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

    public async Task<string> GenerateImageAsync(
        string prompt,
        CancellationToken ct = default)
    {
        try
        {
            await using var client = new Client(apiKey: _options.ApiKey);
            var config = new GenerateImagesConfig
            {
                NumberOfImages = 1,
                AspectRatio = "1:1",
                OutputMimeType = "image/png"
            };

            var response = await client.Models.GenerateImagesAsync(
                model: "gemini-3.1-flash-image",
                prompt: prompt,
                config: config,
                cancellationToken: ct
            );

            if (response.GeneratedImages == null || !response.GeneratedImages.Any())
            {
                throw new Exception("No images generated from Gemini image model");
            }

            var imageBytes = response.GeneratedImages.First().Image.ImageBytes;
            
            using var imageStream = new MemoryStream(imageBytes);
            var uploadResult = await _storageService.SaveAsync(imageStream, $"repurpose-{Guid.NewGuid()}.png", "image/png");

            return uploadResult.PublicUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini image generation failed");
            throw;
        }
    }

    public async Task<string> GenerateVideoAsync(
        string prompt,
        CancellationToken ct = default)
    {
        try
        {
            await using var client = new Client(apiKey: _options.ApiKey);
            
            var source = new GenerateVideosSource { Prompt = prompt };
            var config = new GenerateVideosConfig
            {
                AspectRatio = "16:9",
                DurationSeconds = 6
            };

            var operation = await client.Models.GenerateVideosAsync(
                model: "veo-3.1-lite-generate-preview",
                source: source,
                config: config,
                cancellationToken: ct
            );

            var maxPoll = 12;
            for (var i = 0; i < maxPoll; i++)
            {
                ct.ThrowIfCancellationRequested();
                await Task.Delay(10000, ct);

                operation = await client.Operations.GetAsync(operation, null, ct);
                if (operation.Done == true)
                {
                    break;
                }
            }

            if (operation.Done != true)
            {
                throw new TimeoutException("Video generation timed out on Veo model");
            }

            if (operation.Response?.GeneratedVideos == null || !operation.Response.GeneratedVideos.Any())
            {
                throw new Exception("No videos returned from Veo video model");
            }

            var tempFile = Path.GetTempFileName();

            await client.Files.DownloadToFileAsync(
                generatedVideo: operation.Response.GeneratedVideos.First(),
                outputPath: tempFile,
                cancellationToken: ct
            );

            using var fileStream = System.IO.File.OpenRead(tempFile);
            var uploadResult = await _storageService.SaveAsync(fileStream, $"repurpose-{Guid.NewGuid()}.mp4", "video/mp4");

            try
            {
                System.IO.File.Delete(tempFile);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete temp file: {TempFile}", tempFile);
            }

            return uploadResult.PublicUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Veo video generation failed");
            throw;
        }
    }
}
