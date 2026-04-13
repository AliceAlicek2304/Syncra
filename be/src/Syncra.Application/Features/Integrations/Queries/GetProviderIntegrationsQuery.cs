using MediatR;
using Syncra.Application.DTOs.Integrations;

namespace Syncra.Application.Features.Integrations.Queries;

public record GetProviderIntegrationsQuery(
    Guid WorkspaceId,
    string ProviderId
) : IRequest<IReadOnlyList<IntegrationDto>>;
