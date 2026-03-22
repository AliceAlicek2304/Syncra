using System.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Features.Integrations.Commands;
using Syncra.Application.Features.Integrations.Queries;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class IntegrationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public IntegrationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// POST /api/v1/workspaces/{workspaceId}/integrations/{providerId}/connect
    /// Initializes the OAuth connect flow and returns the authorization URL.
    /// </summary>
    [HttpPost("{providerId}/connect")]
    public async Task<IActionResult> Connect(
        Guid workspaceId,
        string providerId,
        [FromQuery] string? redirectUri = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? frontendRedirectUri = null,
        CancellationToken cancellationToken = default)
    {
        var url = await _mediator.Send(new ConnectIntegrationCommand(workspaceId, providerId, redirectUri, entityType, frontendRedirectUri), cancellationToken);
        return Ok(new { url });
    }

    /// <summary>
    /// GET /api/v1/integrations/{providerId}/callback
    /// Handles the OAuth callback from the provider and exchanges the code for tokens.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("~/api/v1/integrations/{providerId}/callback")]
    public async Task<IActionResult> Callback(
        string providerId,
        [FromQuery] string code,
        [FromQuery] string state,
        [FromQuery] string? redirectUri = null,
        CancellationToken cancellationToken = default)
    {
        var stateParams = HttpUtility.ParseQueryString(state);
        var workspaceIdStr = stateParams["workspaceId"];
        var frontendRedirectUri = stateParams["frontendRedirectUri"];

        if (string.IsNullOrEmpty(workspaceIdStr) || !Guid.TryParse(workspaceIdStr, out var workspaceId))
        {
            return RedirectWithError(frontendRedirectUri ?? "/", "Invalid or missing workspaceId in state parameter");
        }

        if (string.IsNullOrEmpty(redirectUri))
        {
            var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
            redirectUri = $"{scheme}://{Request.Host}{Request.Path}";
        }

        try
        {
            var result = await _mediator.Send(
                new OAuthCallbackCommand(workspaceId, providerId, code, state, redirectUri),
                cancellationToken);

            // Redirect back to frontend app with success parameter
            var redirectUrl = $"{frontendRedirectUri}?connected={providerId}";
            return Redirect(redirectUrl);
        }
        catch (Exception ex)
        {
            // Redirect back to frontend app with error parameter
            return RedirectWithError(frontendRedirectUri ?? "/", ex.Message);
        }
    }

    private IActionResult RedirectWithError(string baseUrl, string error)
    {
        var separator = baseUrl.Contains('?') ? '&' : '?';
        return Redirect($"{baseUrl}{separator}integration_error={Uri.EscapeDataString(error)}");
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/integrations
    /// Lists all active integrations for a workspace.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetIntegrationsQuery(workspaceId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// DELETE /api/v1/workspaces/{workspaceId}/integrations/{providerId}
    /// Disconnects a specific provider from the workspace.
    /// </summary>
    [HttpDelete("{providerId}")]
    public async Task<IActionResult> Disconnect(
        Guid workspaceId,
        string providerId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new DisconnectIntegrationCommand(workspaceId, providerId), cancellationToken);
        return Ok(new { message = "Disconnected successfully", workspaceId, providerId });
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/integrations/{providerId}/health
    /// Returns health status of a specific integration.
    /// </summary>
    [HttpGet("{providerId}/health")]
    public async Task<IActionResult> Health(
        Guid workspaceId,
        string providerId,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetIntegrationHealthQuery(workspaceId, providerId), cancellationToken);
        return Ok(result);
    }
}
