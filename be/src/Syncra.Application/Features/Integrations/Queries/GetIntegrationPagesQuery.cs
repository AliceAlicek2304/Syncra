using MediatR;
using Syncra.Application.DTOs.Integrations;

namespace Syncra.Application.Features.Integrations.Queries;

public sealed record GetIntegrationPagesQuery(
    Guid WorkspaceId,
    Guid IntegrationId
) : IRequest<IReadOnlyList<IntegrationPageDto>>;
