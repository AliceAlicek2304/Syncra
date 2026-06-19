using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Api.Filters;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;
using Syncra.Application.Services;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/repurpose")]
public sealed class RepurposeController : ControllerBase
{
    private readonly IRepurposeService _repurposeService;
    private readonly IWebScraperService _webScraper;
    private readonly ILogger<RepurposeController> _logger;
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public RepurposeController(
        IRepurposeService repurposeService,
        IWebScraperService webScraper,
        ILogger<RepurposeController> logger)
    {
        _repurposeService = repurposeService;
        _webScraper = webScraper;
        _logger = logger;
    }

    [HttpPost("fetch-url")]
    [ServiceFilter(typeof(RepurposePlanLimitFilter))]
    public async Task<IActionResult> FetchUrl(
        Guid workspaceId,
        [FromBody] FetchUrlRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { code = "missing_url", message = "url is required." });
        }

        try
        {
            var (title, content) = await _webScraper.FetchUrlContentAsync(request.Url, cancellationToken);
            return Ok(new { title, content });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to fetch URL {Url}", request.Url);
            return BadRequest(new { code = "fetch_failed", message = $"Could not fetch content from URL: {ex.Message}" });
        }
        catch (TaskCanceledException)
        {
            return BadRequest(new { code = "timeout", message = "Request timed out after 10 seconds." });
        }
    }

    [HttpPost("generate")]
    [ServiceFilter(typeof(RepurposePlanLimitFilter))]
    public async Task Generate(
        Guid workspaceId,
        [FromBody] RepurposeGenerateRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            HttpContext.Response.StatusCode = 401;
            await HttpContext.Response.WriteAsJsonAsync(
                new { code = "unauthorized", message = "User not authenticated." }, cancellationToken);
            return;
        }

        if (string.IsNullOrWhiteSpace(request.SourceText) && (request.SelectedPostIds == null || request.SelectedPostIds.Count == 0))
        {
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsJsonAsync(
                new { code = "missing_source_text", message = "sourceText is required when no posts are selected." }, cancellationToken);
            return;
        }

        if (request.Platforms is null || request.Platforms.Count == 0)
        {
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsJsonAsync(
                new { code = "missing_platforms", message = "At least one platform is required." }, cancellationToken);
            return;
        }

        var isSse = HttpContext.Request.Headers.Accept.ToString().Contains("text/event-stream");

        var supportingSources = request.SupportingSources?
            .Select(s => new SupportingSourceInfo(s.Id, s.Type, s.Label, s.Url, s.FileName))
            .ToList();

        if (!isSse && _repurposeService is IRepurposeService syncService)
        {
            var dtoRequest = new RepurposeRequest(
                SourceText: request.SourceText ?? string.Empty,
                Platforms: request.Platforms,
                Tone: request.Tone ?? "default",
                ExtractAtoms: request.ExtractAtoms,
                Language: request.Language ?? "en",
                ContentLength: request.ContentLength ?? "medium",
                SupportingSources: supportingSources,
                SelectedPostIds: request.SelectedPostIds,
                GenerateMedia: request.GenerateMedia,
                MediaType: request.MediaType);

            var result = await syncService.GenerateAsync(dtoRequest, cancellationToken);

            if (!result.IsSuccess)
            {
                _logger.LogWarning(
                    "Repurpose generation failed for workspace {WorkspaceId}: {Error}",
                    workspaceId, result.Error);

                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsJsonAsync(
                    new { code = "generation_failed", message = result.Error }, cancellationToken);
                return;
            }

            _logger.LogInformation(
                "Generated {AtomCount} repurpose atoms for workspace {WorkspaceId}",
                result.Value!.Atoms.Count, workspaceId);

            HttpContext.Response.StatusCode = 200;
            await HttpContext.Response.WriteAsJsonAsync(result.Value, cancellationToken);
            return;
        }

        if (_repurposeService is not AIRepurposeService aiService)
        {
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsJsonAsync(
                new { code = "sse_unavailable", message = "SSE streaming is not available." }, cancellationToken);
            return;
        }

        HttpContext.Response.ContentType = "text/event-stream";
        HttpContext.Response.Headers.CacheControl = "no-cache";
        HttpContext.Response.Headers.Connection = "keep-alive";

        var aiRequest = new RepurposeRequest(
            SourceText: request.SourceText ?? string.Empty,
            Platforms: request.Platforms,
            Tone: request.Tone ?? "default",
            ExtractAtoms: request.ExtractAtoms,
            Language: request.Language ?? "en",
            ContentLength: request.ContentLength ?? "medium",
            SupportingSources: supportingSources,
            SelectedPostIds: request.SelectedPostIds,
            GenerateMedia: request.GenerateMedia,
            MediaType: request.MediaType);

        try
        {
            await foreach (var sseEvent in aiService.GenerateStreamAsync(workspaceId, aiRequest, cancellationToken))
            {
                await HttpContext.Response.WriteAsync($"event: {sseEvent.Type}\n", cancellationToken);
                await HttpContext.Response.WriteAsync(
                    $"data: {JsonSerializer.Serialize(sseEvent.Data, _jsonOptions)}\n\n", cancellationToken);
                await HttpContext.Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("SSE stream cancelled for workspace {WorkspaceId}", workspaceId);
        }
    }

    [HttpGet("{sessionId}")]
    public async Task<IActionResult> GetSession(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var result = await _repurposeService.GetSessionAsync(workspaceId, sessionId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { code = "session_not_found", message = result.Error });
        }

        return Ok(result.Value);
    }

    [HttpDelete("{sessionId}")]
    public async Task<IActionResult> DeleteSession(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var result = await _repurposeService.DeleteSessionAsync(workspaceId, sessionId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { code = "session_not_found", message = result.Error });
        }

        return NoContent();
    }

    [HttpGet]
    public async Task<IActionResult> ListSessions(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var sessions = await _repurposeService.GetSessionsAsync(workspaceId, cancellationToken);
        return Ok(new { sessions });
    }
}

public sealed record RepurposeGenerateRequest(
    string? SourceText,
    IReadOnlyList<string> Platforms,
    string? Tone,
    bool ExtractAtoms,
    string? Language = null,
    string? ContentLength = null,
    IReadOnlyList<SupportingSourceRequest>? SupportingSources = null,
    IReadOnlyList<Guid>? SelectedPostIds = null,
    bool? GenerateMedia = null,
    string? MediaType = null);

public sealed record FetchUrlRequest(string Url);

public sealed record SupportingSourceRequest(
    string Id,
    string Type,
    string Label,
    string? Url = null,
    string? FileName = null);
