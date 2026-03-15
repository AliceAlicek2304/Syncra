using System.Text.Json;
using MediatR;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Integrations.Queries;

public sealed class GetIntegrationHealthQueryHandler : IRequestHandler<GetIntegrationHealthQuery, IntegrationHealthDto?>
{
    private readonly IIntegrationRepository _integrationRepository;

    public GetIntegrationHealthQueryHandler(IIntegrationRepository integrationRepository)
    {
        _integrationRepository = integrationRepository;
    }

    public async Task<IntegrationHealthDto?> Handle(GetIntegrationHealthQuery request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(
            request.WorkspaceId,
            request.ProviderId);

        if (integration == null)
        {
            return null;
        }

        var isTokenExpired = integration.IsTokenExpired;

        string status = !integration.IsActive
            ? "disconnected"
            : isTokenExpired
                ? "token_expired"
                : integration.IsTokenRefreshHealthy
                    ? "ok"
                    : "error";

        Dictionary<string, string>? metadata = null;
        if (!string.IsNullOrEmpty(integration.Metadata))
        {
            try
            {
                metadata = JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata);
            }
            catch
            {
                // Ignore
            }
        }

        return new IntegrationHealthDto(
            status,
            request.ProviderId,
            integration.IsActive,
            isTokenExpired,
            integration.ExpiresAtUtc,
            integration.TokenRefreshLastSuccessAtUtc,
            integration.TokenRefreshLastError,
            integration.ExternalAccountId,
            metadata);
    }
}