using System.Text.Json;
using Syncra.Application.DTOs.Integrations;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Integrations;

public static class IntegrationMapper
{
    public static IntegrationDto ToDto(Integration integration)
    {
        Dictionary<string, string>? metadata = null;
        if (!string.IsNullOrEmpty(integration.Metadata))
        {
            try
            {
                metadata = JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new IntegrationDto(
            integration.Id,
            integration.WorkspaceId,
            integration.Platform,
            integration.ExternalAccountId,
            integration.IsActive,
            integration.ExpiresAtUtc,
            integration.TokenRefreshLastSuccessAtUtc,
            integration.TokenRefreshHealthStatus == Syncra.Domain.Enums.IntegrationRefreshHealthStatus.NeedsReauth ? "needs_reauth" : integration.TokenRefreshHealthStatus?.ToString().ToLowerInvariant(),
            metadata);
    }
}