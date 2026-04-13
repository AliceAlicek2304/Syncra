using MediatR;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class DisconnectIntegrationByIdCommandHandler : IRequestHandler<DisconnectIntegrationByIdCommand, bool>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DisconnectIntegrationByIdCommandHandler(
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork)
    {
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(DisconnectIntegrationByIdCommand request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId);

        if (integration == null || integration.WorkspaceId != request.WorkspaceId)
        {
            throw new DomainException("not_found", "Integration not found for this workspace.");
        }

        integration.Deactivate();

        await _integrationRepository.UpdateAsync(integration);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}
