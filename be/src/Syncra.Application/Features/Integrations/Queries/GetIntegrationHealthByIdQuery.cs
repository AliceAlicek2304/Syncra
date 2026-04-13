using MediatR;
using Syncra.Application.DTOs.Integrations;

namespace Syncra.Application.Features.Integrations.Queries;

public record GetIntegrationHealthByIdQuery(
    Guid WorkspaceId,
    Guid IntegrationId
) : IRequest<IntegrationHealthDto?>;
