using System.Text.Json;
using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Queries;

public sealed class GetIntegrationHealthByIdQueryHandler : IRequestHandler<GetIntegrationHealthByIdQuery, IntegrationHealthDto?>
{
    private readonly IIntegrationRepository _integrationRepository;

    public GetIntegrationHealthByIdQueryHandler(IIntegrationRepository integrationRepository)
    {
        _integrationRepository = integrationRepository;
    }

    public async Task<IntegrationHealthDto?> Handle(GetIntegrationHealthByIdQuery request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId);

        if (integration == null || integration.WorkspaceId != request.WorkspaceId)
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
            integration.Platform,
            integration.IsActive,
            isTokenExpired,
            integration.ExpiresAtUtc,
            integration.TokenRefreshLastSuccessAtUtc,
            integration.TokenRefreshLastError,
            integration.ExternalAccountId,
            metadata);
    }
}
