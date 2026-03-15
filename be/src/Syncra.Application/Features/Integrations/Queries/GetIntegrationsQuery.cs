using MediatR;
using Syncra.Application.DTOs.Integrations;

namespace Syncra.Application.Features.Integrations.Queries;

public record GetIntegrationsQuery(
    Guid WorkspaceId
) : IRequest<IReadOnlyList<IntegrationDto>>;