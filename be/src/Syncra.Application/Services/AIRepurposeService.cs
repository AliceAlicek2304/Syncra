using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.AI;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;
using DomainEntities = Syncra.Domain.Entities;

namespace Syncra.Application.Services;

public sealed class AIRepurposeService : IRepurposeService
{
    private readonly IAIProvider _aiProvider;
    private readonly IPromptEngineeringService _promptEngineer;
    private readonly IRepurposeCache _cache;
    private readonly RepurposeService _v1Fallback;
    private readonly IRepurposeRepository _repository;
    private readonly IPostRepository _postRepository;
    private readonly IStorageService _storageService;
    private readonly ILogger<AIRepurposeService> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public AIRepurposeService(
        IAIProvider aiProvider,
        IPromptEngineeringService promptEngineer,
        IRepurposeCache cache,
        RepurposeService v1Fallback,
        IRepurposeRepository repository,
        IPostRepository postRepository,
        IStorageService storageService,
        ILogger<AIRepurposeService> logger)
    {
        _aiProvider = aiProvider;
        _promptEngineer = promptEngineer;
        _cache = cache;
        _v1Fallback = v1Fallback;
        _repository = repository;
        _postRepository = postRepository;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<Result<RepurposeResult>> GenerateAsync(
        RepurposeRequest request,
        CancellationToken cancellationToken = default)
    {
        var selectedPostsText = "";
        if (request.SelectedPostIds is { Count: > 0 })
        {
            var posts = await _postRepository.GetByIdsAsync(request.SelectedPostIds);
            var sb = new StringBuilder();
            foreach (var post in posts)
            {
                sb.AppendLine("---");
                sb.AppendLine($"[Post Title: {post.Title.Value}]");
                sb.AppendLine($"[Status: {post.Status}]");
                if (post.PublishedAtUtc.HasValue)
                {
                    sb.AppendLine($"[Published: {post.PublishedAtUtc.Value:yyyy-MM-dd}]");
                }
                sb.AppendLine("[Content]");
                sb.AppendLine(post.Content.Value);
            }
            if (sb.Length > 0)
            {
                sb.AppendLine("---");
                selectedPostsText = sb.ToString();
            }
        }

        var sourceTextWithPosts = string.IsNullOrWhiteSpace(request.SourceText)
            ? selectedPostsText
            : $"{request.SourceText}\n\n{selectedPostsText}";

        var modifiedRequest = request with { SourceText = sourceTextWithPosts };

        var cacheKey = BuildCacheKey(modifiedRequest);

        var cached = await _cache.GetAsync(cacheKey, cancellationToken);
        if (cached is not null)
        {
            _logger.LogInformation("Repurpose cache hit for key {CacheKey}", cacheKey);
            return Result<RepurposeResult>.Success(cached);
        }

        try
        {
            var result = await GenerateWithAIAsync(modifiedRequest, cancellationToken);
            if (result is not null)
            {
                await _cache.SetAsync(cacheKey, result, TimeSpan.FromHours(24), cancellationToken);
                return Result<RepurposeResult>.Success(result);
            }

            return Result<RepurposeResult>.Failure("AI generation returned no result");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI repurpose failed, falling back to V1 templates");
            return await _v1Fallback.GenerateAsync(modifiedRequest, cancellationToken);
        }
    }

    public async IAsyncEnumerable<RepurposeStreamEvent> GenerateStreamAsync(
        Guid workspaceId,
        RepurposeRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var selectedPostsText = "";
        if (request.SelectedPostIds is { Count: > 0 })
        {
            var posts = await _postRepository.GetByIdsAsync(request.SelectedPostIds);
            var sb = new StringBuilder();
            foreach (var post in posts.Where(p => p.WorkspaceId == workspaceId))
            {
                sb.AppendLine("---");
                sb.AppendLine($"[Post Title: {post.Title.Value}]");
                sb.AppendLine($"[Status: {post.Status}]");
                if (post.PublishedAtUtc.HasValue)
                {
                    sb.AppendLine($"[Published: {post.PublishedAtUtc.Value:yyyy-MM-dd}]");
                }
                sb.AppendLine("[Content]");
                sb.AppendLine(post.Content.Value);
            }
            if (sb.Length > 0)
            {
                sb.AppendLine("---");
                selectedPostsText = sb.ToString();
            }
        }

        var sourceTextWithPosts = string.IsNullOrWhiteSpace(request.SourceText)
            ? selectedPostsText
            : $"{request.SourceText}\n\n{selectedPostsText}";

        var supportingSourcesJson = request.SupportingSources is { Count: > 0 }
            ? System.Text.Json.JsonSerializer.Serialize(request.SupportingSources)
            : null;

        var session = DomainEntities.RepurposeSession.Create(
            workspaceId, 
            sourceTextWithPosts, 
            request.Tone, 
            string.Join(",", request.Platforms),
            request.ContentLength,
            request.Language,
            request.ExtractAtoms,
            supportingSourcesJson);
        
        await _repository.AddSessionAsync(session, ct);
        await _repository.SaveChangesAsync(ct);

        yield return new RepurposeStreamEvent("metadata", new { key = "session_id", value = session.Id.ToString() });

        var modifiedRequest = request with { SourceText = sourceTextWithPosts };

        await foreach (var e in StreamEventsAsync(workspaceId, session, modifiedRequest, ct))
        {
            yield return e;
        }
    }

    private async IAsyncEnumerable<RepurposeStreamEvent> StreamEventsAsync(
        Guid workspaceId, 
        DomainEntities.RepurposeSession session, 
        RepurposeRequest request, 
        [EnumeratorCancellation] CancellationToken ct)
    {
        var cacheKey = BuildCacheKey(request);
        var totalPlatforms = request.Platforms.Count;

        yield return new RepurposeStreamEvent("metadata",
            new { key = "total_platforms", value = totalPlatforms.ToString() });

        var cached = await _cache.GetAsync(cacheKey, ct);
        if (cached is not null)
        {
            _logger.LogInformation("Repurpose cache hit for key {CacheKey}", cacheKey);

            foreach (var atomDto in cached.Atoms)
            {
                var atom = DomainEntities.RepurposeAtom.Create(
                    session.Id,
                    atomDto.Platform,
                    atomDto.Type,
                    atomDto.Content,
                    atomDto.Title,
                    string.Join(",", atomDto.SuggestedHashtags),
                    atomDto.SuggestedCta,
                    atomDto.MediaUrl,
                    atomDto.MediaType);
                session.AddAtom(atom);
                await _repository.AddAtomAsync(atom, ct);
            }
            session.MarkAsCompleted();
            await _repository.SaveChangesAsync(ct);

            yield return new RepurposeStreamEvent("complete", cached);
            yield return new RepurposeStreamEvent("metadata", new { key = "source", value = "cache" });
            yield break;
        }

        var prompt = _promptEngineer.BuildPrompt(request);
        IAsyncEnumerator<RepurposeStreamEvent>? enumerator = null;
        Exception? startException = null;
        try
        {
            enumerator = StreamEventsFromAIAsync(session, request, prompt, totalPlatforms, cacheKey, ct).GetAsyncEnumerator(ct);
        }
        catch (Exception ex)
        {
            startException = ex;
        }

        if (startException is not null)
        {
            _logger.LogError(startException, "AI repurpose streaming failed before starting");
            session.MarkAsFailed(startException.Message);
            await _repository.SaveChangesAsync(ct);
            yield return new RepurposeStreamEvent("error", new { code = "stream_error", message = startException.Message });
            yield break;
        }

        Exception? iterationException = null;
        try
        {
            while (true)
            {
                RepurposeStreamEvent item;
                try
                {
                    if (!await enumerator.MoveNextAsync())
                        break;
                    item = enumerator.Current;
                }
                catch (Exception ex)
                {
                    iterationException = ex;
                    break;
                }

                yield return item;
            }
        }
        finally
        {
            if (enumerator != null)
            {
                await enumerator.DisposeAsync();
            }
        }

        if (iterationException is not null)
        {
            _logger.LogError(iterationException, "AI repurpose streaming failed during iteration");
            session.MarkAsFailed(iterationException.Message);
            await _repository.SaveChangesAsync(ct);
            yield return new RepurposeStreamEvent("error", new { code = "stream_error", message = iterationException.Message });
        }
    }

    private async IAsyncEnumerable<RepurposeStreamEvent> StreamEventsFromAIAsync(
        DomainEntities.RepurposeSession session,
        RepurposeRequest request,
        PromptComponents prompt,
        int totalPlatforms,
        string cacheKey,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var completeFired = false;
        var fullOutput = new StringBuilder();

        await foreach (var streamEvent in _aiProvider.GenerateStreamAsync(
            prompt.SystemPrompt, prompt.UserPrompt, null, ct))
        {
            switch (streamEvent)
            {
                case TokenEvent token:
                    fullOutput.Append(token.Text);
                    yield return new RepurposeStreamEvent("token", new { text = token.Text });

                    if (TryExtractPartialJson(fullOutput.ToString(), out var partial))
                    {
                        yield return new RepurposeStreamEvent("partial_json",
                            new { atoms = partial.Atoms, progress = CalculateProgress(partial.Atoms.Count, totalPlatforms) });
                    }
                    break;

                case CompleteEvent complete:
                    var result = ParseResult(complete.FullOutput);
                    if (result is not null && result.Atoms.Count > 0)
                    {
                        if (request.GenerateMedia == true && !string.IsNullOrEmpty(request.MediaType))
                        {
                            result = await GenerateMediaForAtomsAsync(result, request.MediaType, ct);
                        }

                        await _cache.SetAsync(cacheKey, result, TimeSpan.FromHours(24), ct);

                        foreach (var atomDto in result.Atoms)
                        {
                            var atom = DomainEntities.RepurposeAtom.Create(
                                session.Id,
                                atomDto.Platform,
                                atomDto.Type,
                                atomDto.Content,
                                atomDto.Title,
                                string.Join(",", atomDto.SuggestedHashtags),
                                atomDto.SuggestedCta,
                                atomDto.MediaUrl,
                                atomDto.MediaType);
                            session.AddAtom(atom);
                            await _repository.AddAtomAsync(atom, ct);
                        }
                        session.MarkAsCompleted();
                        await _repository.SaveChangesAsync(ct);

                        var platformGroups = result.Atoms.GroupBy(a => a.Platform).ToList();
                        for (var i = 0; i < platformGroups.Count; i++)
                        {
                            var platformGroup = platformGroups[i];
                            var progress = totalPlatforms > 0
                                ? Math.Min(1.0, (double)(i + 1) / totalPlatforms)
                                : 1.0;
                            yield return new RepurposeStreamEvent("platform_complete",
                                new { platform = platformGroup.Key, atoms = platformGroup.Select(a => a with { MediaUrl = string.IsNullOrEmpty(a.MediaUrl) ? a.MediaUrl : _storageService.GetPresignedUrl(a.MediaUrl, 24) }).ToList(), progress });
                        }

                        yield return new RepurposeStreamEvent("complete", new RepurposeResult(result.Atoms.Select(a => a with { MediaUrl = string.IsNullOrEmpty(a.MediaUrl) ? a.MediaUrl : _storageService.GetPresignedUrl(a.MediaUrl, 24) }).ToList()));
                        yield return new RepurposeStreamEvent("metadata",
                            new { key = "usage", value = JsonSerializer.Serialize(
                                new { prompt_tokens = complete.PromptTokens, completion_tokens = complete.CompletionTokens }) });
                        completeFired = true;
                    }
                    else
                    {
                        session.MarkAsFailed("AI returned no atoms");
                        await _repository.SaveChangesAsync(ct);
                        yield return new RepurposeStreamEvent("error",
                            new { code = "empty_result", message = "AI returned no atoms" });
                    }
                    break;

                case ErrorEvent error:
                    session.MarkAsFailed(error.Message);
                    await _repository.SaveChangesAsync(ct);
                    yield return new RepurposeStreamEvent("error",
                        new { code = error.Code, message = error.Message });
                    yield break;
            }
        }

        if (!completeFired)
        {
            _logger.LogWarning("AI repurpose returned empty result, falling back to V1");
            var fallbackResult = await _v1Fallback.GenerateAsync(request, ct);
            if (fallbackResult.IsSuccess)
            {
                var fallbackAtoms = fallbackResult.Value!;
                if (request.GenerateMedia == true && !string.IsNullOrEmpty(request.MediaType))
                {
                    fallbackAtoms = await GenerateMediaForAtomsAsync(fallbackAtoms, request.MediaType, ct);
                }

                foreach (var atomDto in fallbackAtoms.Atoms)
                {
                    var atom = DomainEntities.RepurposeAtom.Create(
                        session.Id,
                        atomDto.Platform,
                        atomDto.Type,
                        atomDto.Content,
                        atomDto.Title,
                        string.Join(",", atomDto.SuggestedHashtags),
                        atomDto.SuggestedCta,
                        atomDto.MediaUrl,
                        atomDto.MediaType);
                    session.AddAtom(atom);
                    await _repository.AddAtomAsync(atom, ct);
                }
                session.MarkAsCompleted();
                await _repository.SaveChangesAsync(ct);
                
                yield return new RepurposeStreamEvent("complete", new RepurposeResult(fallbackAtoms.Atoms.Select(a => a with { MediaUrl = string.IsNullOrEmpty(a.MediaUrl) ? a.MediaUrl : _storageService.GetPresignedUrl(a.MediaUrl, 24) }).ToList()));
            }
        }
    }


    public async Task<Result<RepurposeResult>> GetSessionAsync(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetSessionByIdAsync(workspaceId, sessionId, cancellationToken);

        if (session is null)
        {
            return Result<RepurposeResult>.Failure("Session not found");
        }

        var atoms = session.Atoms.Select(a => new Syncra.Application.DTOs.Repurpose.RepurposeAtom(
            Id: a.Id.ToString(),
            Type: a.Type,
            Title: a.Title,
            Content: a.Content,
            Platform: a.Platform,
            SuggestedHashtags: a.SuggestedHashtags?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>(),
            SuggestedCta: a.SuggestedCTA,
            MediaUrl: string.IsNullOrEmpty(a.MediaUrl) ? a.MediaUrl : _storageService.GetPresignedUrl(a.MediaUrl, 24),
            MediaType: a.MediaType)).ToList();

        return Result<RepurposeResult>.Success(new RepurposeResult(atoms));
    }

    private async Task<RepurposeResult> GenerateMediaForAtomsAsync(
        RepurposeResult result, 
        string mediaType, 
        CancellationToken ct)
    {
        var updatedAtoms = new List<Syncra.Application.DTOs.Repurpose.RepurposeAtom>();
        foreach (var atom in result.Atoms)
        {
            var mediaUrl = "";
            try
            {
                var mediaPrompt = $"Generate a professional, high-fidelity social media visual for: {atom.Content}. Stylized corporate illustration, modern glassmorphism, clean background.";
                
                if (mediaType == "video")
                {
                    mediaPrompt = $"Create a premium motion graphic preview for: {atom.Content}. 4k, smooth animation, loopable.";
                    mediaUrl = await _aiProvider.GenerateVideoAsync(mediaPrompt, ct);
                }
                else
                {
                    mediaUrl = await _aiProvider.GenerateImageAsync(mediaPrompt, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate media for atom {AtomId}. Using mock fallback.", atom.Id);
                if (mediaType == "video")
                {
                    mediaUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
                }
                else
                {
                    mediaUrl = "uploads/mock-image.png";
                }
            }

            updatedAtoms.Add(atom with { MediaUrl = mediaUrl, MediaType = mediaType });
        }
        return new RepurposeResult(updatedAtoms);
    }

    public async Task<IReadOnlyList<RepurposeSessionSummary>> GetSessionsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        var sessions = await _repository.GetSessionsByWorkspaceIdAsync(workspaceId, cancellationToken);

        return sessions.Select(s => new RepurposeSessionSummary(
            Id: s.Id.ToString(),
            SourceText: s.SourceText.Length > 120 ? s.SourceText[..120] + "..." : s.SourceText,
            TargetPlatforms: s.TargetPlatforms,
            Tone: s.Tone,
            Status: s.Status.ToString(),
            Language: s.Language,
            ContentLength: s.ContentLength,
            ExtractAtoms: s.ExtractAtoms,
            CreatedAtUtc: s.CreatedAtUtc)).ToList();
    }

    public async Task<Result<bool>> DeleteSessionAsync(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetSessionByIdAsync(workspaceId, sessionId, cancellationToken);
        if (session is null)
        {
            return Result<bool>.Failure("Session not found");
        }

        await _repository.DeleteSessionAsync(sessionId, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    private async Task<RepurposeResult?> GenerateWithAIAsync(RepurposeRequest request, CancellationToken ct)
    {
        var prompt = _promptEngineer.BuildPrompt(request);
        var fullOutput = new StringBuilder();

        await foreach (var streamEvent in _aiProvider.GenerateStreamAsync(
            prompt.SystemPrompt, prompt.UserPrompt, null, ct))
        {
            if (streamEvent is TokenEvent token)
            {
                fullOutput.Append(token.Text);
            }
            else if (streamEvent is CompleteEvent complete)
            {
                return ParseResult(complete.FullOutput);
            }
            else if (streamEvent is ErrorEvent error)
            {
                _logger.LogWarning("AI generation error: {Code} - {Message}", error.Code, error.Message);
                return null;
            }
        }

        var output = fullOutput.ToString();
        return string.IsNullOrWhiteSpace(output) ? null : ParseResult(output);
    }

    private static RepurposeResult? ParseResult(string json)
    {
        try
        {
            var cleaned = json.Trim();
            if (cleaned.StartsWith("```"))
            {
                var start = cleaned.IndexOf('\n');
                var end = cleaned.LastIndexOf("```");
                if (start > 0 && end > start)
                    cleaned = cleaned[(start + 1)..end].Trim();
            }

            using var doc = JsonDocument.Parse(cleaned);
            var root = doc.RootElement;

            if (!root.TryGetProperty("atoms", out var atomsElement))
                return null;

            var atoms = new List<Syncra.Application.DTOs.Repurpose.RepurposeAtom>();
            var id = 1;

            foreach (var atom in atomsElement.EnumerateArray())
            {
                var platform = atom.TryGetProperty("platform", out var p) ? p.GetString() ?? "unknown" : "unknown";
                var type = atom.TryGetProperty("type", out var t) ? t.GetString() ?? "POST" : "POST";
                var title = atom.TryGetProperty("title", out var ti) ? ti.GetString() : null;
                var content = atom.TryGetProperty("content", out var c) ? c.GetString() ?? string.Empty : string.Empty;
                var hashtags = atom.TryGetProperty("suggested_hashtags", out var h) && h.ValueKind == JsonValueKind.Array
                    ? h.EnumerateArray().Select(x => x.GetString() ?? string.Empty).Where(x => !string.IsNullOrEmpty(x)).ToList().AsReadOnly()
                    : (IReadOnlyList<string>)Array.Empty<string>();
                var cta = atom.TryGetProperty("suggested_cta", out var ct) ? ct.GetString() : null;

                atoms.Add(new Syncra.Application.DTOs.Repurpose.RepurposeAtom(
                    Id: $"atom-{id++}",
                    Type: type,
                    Title: title,
                    Content: content,
                    Platform: platform,
                    SuggestedHashtags: hashtags,
                    SuggestedCta: cta));
            }

            return new RepurposeResult(atoms);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static bool TryExtractPartialJson(string text, out RepurposeResult result)
    {
        result = null!;
        var trimmed = text.Trim();
        if (!trimmed.Contains("\"atoms\""))
            return false;

        var lastComplete = FindLastCompleteObject(trimmed);
        if (lastComplete is null)
            return false;

        var parsed = ParseResult(lastComplete);
        if (parsed is null || parsed.Atoms.Count == 0)
            return false;

        result = parsed;
        return true;
    }

    private static string? FindLastCompleteObject(string text)
    {
        var braceCount = 0;
        var lastCompleteEnd = -1;

        for (var i = 0; i < text.Length; i++)
        {
            if (text[i] == '{') braceCount++;
            else if (text[i] == '}') braceCount--;

            if (braceCount == 0 && i > 0)
                lastCompleteEnd = i + 1;
        }

        return lastCompleteEnd > 0 ? text[..lastCompleteEnd] : null;
    }

    private static double CalculateProgress(int atomsGenerated, int totalPlatforms)
    {
        if (totalPlatforms <= 0) return 0;
        return Math.Min(1.0, (double)atomsGenerated / totalPlatforms);
    }

    internal static string BuildCacheKey(RepurposeRequest request)
    {
        var keyData = $"{request.SourceText}|{string.Join(",", request.Platforms.OrderBy(p => p))}|{request.Tone}|{request.Language}|{request.ContentLength}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(keyData));
        return $"repurpose:v2:{Convert.ToHexString(hash).ToLowerInvariant()}";
    }
}
