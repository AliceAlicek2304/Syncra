using MediatR;
using Syncra.Application.DTOs.Integrations;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Integrations.Queries;

public sealed class GetIntegrationsQueryHandler : IRequestHandler<GetIntegrationsQuery, IReadOnlyList<IntegrationDto>>
{
    private readonly IIntegrationRepository _integrationRepository;

    public GetIntegrationsQueryHandler(IIntegrationRepository integrationRepository)
    {
        _integrationRepository = integrationRepository;
    }

    public async Task<IReadOnlyList<IntegrationDto>> Handle(GetIntegrationsQuery request, CancellationToken cancellationToken)
    {
        var integrations = await _integrationRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        return integrations.Select(IntegrationMapper.ToDto).ToList();
    }
}