using MediatR;
using Syncra.Application.DTOs.Integrations;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Queries;

public sealed class GetProviderIntegrationsQueryHandler : IRequestHandler<GetProviderIntegrationsQuery, IReadOnlyList<IntegrationDto>>
{
    private readonly IIntegrationRepository _integrationRepository;

    public GetProviderIntegrationsQueryHandler(IIntegrationRepository integrationRepository)
    {
        _integrationRepository = integrationRepository;
    }

    public async Task<IReadOnlyList<IntegrationDto>> Handle(GetProviderIntegrationsQuery request, CancellationToken cancellationToken)
    {
        var integrations = await _integrationRepository.GetByWorkspaceAndPlatformAllAsync(request.WorkspaceId, request.ProviderId);
        return integrations.Select(IntegrationMapper.ToDto).ToList();
    }
}
