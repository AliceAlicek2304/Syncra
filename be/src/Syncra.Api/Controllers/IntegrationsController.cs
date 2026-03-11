using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Social;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class IntegrationsController : ControllerBase
{
    private readonly IProviderRegistry _providerRegistry;

    public IntegrationsController(IProviderRegistry providerRegistry)
    {
        _providerRegistry = providerRegistry;
    }

    /// <summary>
    /// POST /api/v1/workspaces/{workspaceId}/integrations/{providerId}/connect
    /// Initializes the OAuth connect flow and returns the authorization URL.
    /// </summary>
    [HttpPost("{providerId}/connect")]
    public IActionResult Connect(Guid workspaceId, string providerId, [FromQuery] string redirectUri)
    {
        try
        {
            var provider = _providerRegistry.GetProvider(providerId);
            
            // Encode minimal state. In production, consider signing this or storing in a session/cache.
            var state = $"workspaceId={workspaceId}";
            
            var url = provider.GetAuthorizationUrl(state, redirectUri);
            
            return Ok(new { url });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/integrations/{providerId}/callback
    /// Handles the OAuth callback from the provider and exchanges the code for tokens.
    /// </summary>
    [HttpGet("{providerId}/callback")]
    public async Task<IActionResult> Callback(
        Guid workspaceId, 
        string providerId, 
        [FromQuery] string code, 
        [FromQuery] string state,
        [FromQuery] string redirectUri,
        CancellationToken cancellationToken)
    {
        try
        {
            var provider = _providerRegistry.GetProvider(providerId);
            
            // Basic state validation
            if (string.IsNullOrEmpty(state) || !state.Contains($"workspaceId={workspaceId}"))
            {
                return BadRequest(new { error = "Invalid or mismatched state parameter." });
            }

            var result = await provider.ExchangeCodeAsync(code, redirectUri, cancellationToken);
            
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            // Phase 01: Return summary. Phase 03 will handle token persistence securely.
            return Ok(new 
            { 
                message = "Successfully connected",
                integration = new
                {
                    workspaceId,
                    providerId,
                    externalUserId = result.ExternalUserId,
                    externalUsername = result.ExternalUsername
                }
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/integrations
    /// Lists all active integrations for a workspace.
    /// </summary>
    [HttpGet]
    public IActionResult List(Guid workspaceId)
    {
        // Phase 01: Skeleton implementation. Will be implemented in Phase 03.
        return Ok(new 
        { 
            message = "List of integrations for workspace (Not Implemented)", 
            workspaceId 
        });
    }

    /// <summary>
    /// DELETE /api/v1/workspaces/{workspaceId}/integrations/{providerId}
    /// Disconnects a specific provider from the workspace.
    /// </summary>
    [HttpDelete("{providerId}")]
    public IActionResult Disconnect(Guid workspaceId, string providerId)
    {
        // Phase 01: Skeleton implementation. Will be implemented in Phase 03.
        return Ok(new 
        { 
            message = "Disconnected successfully (Not Implemented)", 
            workspaceId, 
            providerId 
        });
    }
}
