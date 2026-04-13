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
        var integrations = await _integrationRepository.GetByWorkspaceAndPlatformAllAsync(
            request.WorkspaceId, 
            request.ProviderId);

        if (integrations.Count == 0)
        {
            throw new DomainException(
                "not_found",
                "Integration not found for this provider.");
        }

        foreach (var integration in integrations.Where(i => i.IsActive))
        {
            integration.Deactivate();
            await _integrationRepository.UpdateAsync(integration);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}