using System.Text.Json;
using MediatR;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class SyncIntegrationPagesCommandHandler : IRequestHandler<SyncIntegrationPagesCommand>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IEnumerable<ISocialProvider> _providers;
    private readonly IUnitOfWork _unitOfWork;

    public SyncIntegrationPagesCommandHandler(
        IIntegrationRepository integrationRepository,
        IEnumerable<ISocialProvider> providers,
        IUnitOfWork unitOfWork)
    {
        _integrationRepository = integrationRepository;
        _providers = providers;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(SyncIntegrationPagesCommand request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId);
        if (integration == null || integration.WorkspaceId != request.WorkspaceId)
        {
            throw new DomainException("not_found", "Integration not found.");
        }

        var provider = _providers.FirstOrDefault(p => string.Equals(p.ProviderId, integration.Platform, StringComparison.OrdinalIgnoreCase));
        if (provider == null)
        {
            throw new DomainException("provider_not_found", $"Provider {integration.Platform} not found.");
        }

        // Fetch fresh metadata using the existing access token
        var freshMetadata = await provider.FetchMetadataAsync(integration.AccessToken, cancellationToken);
        if (freshMetadata == null || freshMetadata.Count == 0)
        {
            throw new DomainException("sync_failed", "Failed to fetch fresh metadata from provider.");
        }

        // Update integration metadata
        var existingMetadata = string.IsNullOrEmpty(integration.Metadata)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata) ?? new();

        // Merge: Fresh metadata overwrites existing keys
        foreach (var kvp in freshMetadata)
        {
            existingMetadata[kvp.Key] = kvp.Value;
        }

        integration.SetMetadata(JsonSerializer.Serialize(existingMetadata));
        
        await _integrationRepository.UpdateAsync(integration);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
