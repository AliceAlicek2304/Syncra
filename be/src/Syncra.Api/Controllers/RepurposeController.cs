using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/repurpose")]
public sealed class RepurposeController : ControllerBase
{
    private readonly IRepurposeService _repurposeService;
    private readonly ILogger<RepurposeController> _logger;

    public RepurposeController(
        IRepurposeService repurposeService,
        ILogger<RepurposeController> logger)
    {
        _repurposeService = repurposeService;
        _logger = logger;
    }

    /// <summary>
    /// Generates repurposed content atoms from a source text for the specified platforms.
    /// </summary>
    /// <remarks>
    /// V1 uses template-based generation. Future versions will integrate with
    /// an LLM or Zernio SDK for AI-powered content rewriting.
    /// </remarks>
    [HttpPost("generate")]
    public async Task<IActionResult> Generate(
        Guid workspaceId,
        [FromBody] RepurposeGenerateRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { code = "unauthorized", message = "User not authenticated." });

        if (string.IsNullOrWhiteSpace(request.SourceText))
            return BadRequest(new { code = "missing_source_text", message = "sourceText is required." });

        if (request.Platforms is null || request.Platforms.Count == 0)
            return BadRequest(new { code = "missing_platforms", message = "At least one platform is required." });

        var dtoRequest = new RepurposeRequest(
            SourceText: request.SourceText,
            Platforms: request.Platforms,
            Tone: request.Tone ?? "default",
            ExtractAtoms: request.ExtractAtoms);

        var result = await _repurposeService.GenerateAsync(dtoRequest, cancellationToken);

        if (!result.IsSuccess)
        {
            _logger.LogWarning(
                "Repurpose generation failed for workspace {WorkspaceId}: {Error}",
                workspaceId, result.Error);

            return BadRequest(new { code = "generation_failed", message = result.Error });
        }

        _logger.LogInformation(
            "Generated {AtomCount} repurpose atoms for workspace {WorkspaceId}",
            result.Value!.Atoms.Count, workspaceId);

        return Ok(result.Value);
    }
}

/// <summary>
/// Request body for the repurpose generate endpoint.
/// </summary>
public sealed record RepurposeGenerateRequest(
    string SourceText,
    IReadOnlyList<string> Platforms,
    string? Tone,
    bool ExtractAtoms);
