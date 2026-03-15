using MediatR;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class DisconnectIntegrationCommandHandler : IRequestHandler<DisconnectIntegrationCommand, bool>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DisconnectIntegrationCommandHandler(
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork)
    {
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(DisconnectIntegrationCommand request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(
            request.WorkspaceId, 
            request.ProviderId);

        if (integration == null)
        {
            throw new DomainException(
                "not_found",
                "Integration not found for this provider.");
        }

        // Use domain entity behavior
        integration.Deactivate();

        await _integrationRepository.UpdateAsync(integration);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}