using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Social;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/[controller]")]
public class IntegrationsController : ControllerBase
{
    private readonly IProviderRegistry _providerRegistry;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public IntegrationsController(
        IProviderRegistry providerRegistry,
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork)
    {
        _providerRegistry = providerRegistry;
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// POST /api/v1/workspaces/{workspaceId}/integrations/{providerId}/connect
    /// Initializes the OAuth connect flow and returns the authorization URL.
    /// </summary>
    [HttpPost("{providerId}/connect")]
    public IActionResult Connect(Guid workspaceId, string providerId, [FromQuery] string? redirectUri = null)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { error = "Invalid workspace ID." });
        }

        if (string.IsNullOrWhiteSpace(providerId))
        {
            return BadRequest(new { error = "Provider ID is required." });
        }

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
    [AllowAnonymous]
    [HttpGet("{providerId}/callback")]
    public async Task<IActionResult> Callback(
        Guid workspaceId, 
        string providerId, 
        [FromQuery] string code, 
        [FromQuery] string state,
        [FromQuery] string? redirectUri = null,
        CancellationToken cancellationToken = default)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { error = "Invalid workspace ID." });
        }

        if (string.IsNullOrWhiteSpace(providerId))
        {
            return BadRequest(new { error = "Provider ID is required." });
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { error = "Authorization code is required." });
        }

        try
        {
            var provider = _providerRegistry.GetProvider(providerId);

            // Reconstruct redirectUri if not provided (OAuth providers don't send it back in query string)
            if (string.IsNullOrEmpty(redirectUri))
            {
                var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
                redirectUri = $"{scheme}://{Request.Host}{Request.Path}";
            }
            
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

            var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(workspaceId, providerId);
            if (integration == null)
            {
                integration = new Integration
                {
                    WorkspaceId = workspaceId,
                    Platform = providerId,
                    ExternalAccountId = result.ExternalUserId,
                    AccessToken = result.AccessToken,
                    RefreshToken = result.RefreshToken,
                    ExpiresAtUtc = result.ExpiresAt?.UtcDateTime,
                    IsActive = true,
                    Metadata = JsonSerializer.Serialize(result.Metadata)
                };
                await _integrationRepository.AddAsync(integration);
            }
            else
            {
                integration.ExternalAccountId = result.ExternalUserId ?? integration.ExternalAccountId;
                integration.AccessToken = result.AccessToken ?? integration.AccessToken;
                integration.RefreshToken = result.RefreshToken ?? integration.RefreshToken;
                integration.ExpiresAtUtc = result.ExpiresAt?.UtcDateTime ?? integration.ExpiresAtUtc;
                integration.IsActive = true;
                integration.Metadata = JsonSerializer.Serialize(result.Metadata);
                await _integrationRepository.UpdateAsync(integration);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Phase 03: Token persisted.
            var metadata = string.IsNullOrEmpty(integration.Metadata)
                ? new Dictionary<string, string>()
                : JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata) ?? new();

            return Ok(new 
            { 
                message = "Successfully connected",
                integration = new
                {
                    id = integration.Id,
                    workspaceId,
                    providerId,
                    externalUserId = result.ExternalUserId,
                    externalUsername = result.ExternalUsername,
                    channelId = metadata.GetValueOrDefault("channelId"),
                    channelTitle = metadata.GetValueOrDefault("channelTitle")
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
    public async Task<IActionResult> List(Guid workspaceId)
    {
        var integrations = await _integrationRepository.GetByWorkspaceIdAsync(workspaceId);
        return Ok(integrations);
    }

    /// <summary>
    /// DELETE /api/v1/workspaces/{workspaceId}/integrations/{providerId}
    /// Disconnects a specific provider from the workspace.
    /// </summary>
    [HttpDelete("{providerId}")]
    public async Task<IActionResult> Disconnect(Guid workspaceId, string providerId, CancellationToken cancellationToken)
    {
        if (workspaceId == Guid.Empty)
        {
            return BadRequest(new { error = "Invalid workspace ID." });
        }

        if (string.IsNullOrWhiteSpace(providerId))
        {
            return BadRequest(new { error = "Provider ID is required." });
        }

        var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(workspaceId, providerId);
        if (integration == null)
        {
            return NotFound(new { error = "Integration not found for this provider." });
        }

        integration.IsActive = false;
        integration.AccessToken = null;
        integration.RefreshToken = null;

        await _integrationRepository.UpdateAsync(integration);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Ok(new 
        { 
            message = "Disconnected successfully", 
            workspaceId, 
            providerId 
        });
    }
}
