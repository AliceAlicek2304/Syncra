using System.Text.Json;
using MediatR;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class SetIntegrationActivePageCommandHandler : IRequestHandler<SetIntegrationActivePageCommand, bool>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SetIntegrationActivePageCommandHandler(
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork)
    {
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(SetIntegrationActivePageCommand request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId);

        if (integration == null || integration.WorkspaceId != request.WorkspaceId)
        {
            throw new DomainException("not_found", "Integration not found for this workspace.");
        }

        if (!string.Equals(integration.Platform, "facebook", StringComparison.OrdinalIgnoreCase))
        {
            throw new DomainException("not_supported", "Page selection is currently supported for Facebook only.");
        }

        var metadata = ParseMetadata(integration.Metadata);
        if (!metadata.TryGetValue("pagesJson", out var pagesJson) || string.IsNullOrWhiteSpace(pagesJson))
        {
            throw new DomainException("pages_not_found", "No pages available for this integration. Reconnect Facebook to sync pages.");
        }

        var pages = ParsePages(pagesJson);
        var selected = pages.FirstOrDefault(p => string.Equals(p.Id, request.PageId, StringComparison.Ordinal));

        if (selected == null)
        {
            throw new DomainException("page_not_found", "The selected page does not belong to this integration.");
        }

        metadata["pageId"] = selected.Id;
        metadata["pageName"] = selected.Name ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(selected.AccessToken))
        {
            metadata["pageAccessToken"] = selected.AccessToken;
        }

        if (!string.IsNullOrWhiteSpace(selected.Category))
        {
            metadata["pageCategory"] = selected.Category;
        }

        integration.SetMetadata(JsonSerializer.Serialize(metadata));
        await _integrationRepository.UpdateAsync(integration);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static Dictionary<string, string> ParseMetadata(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return new Dictionary<string, string>();
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(metadataJson) ?? new Dictionary<string, string>();
        }
        catch
        {
            return new Dictionary<string, string>();
        }
    }

    private static List<FacebookPageMetadata> ParsePages(string pagesJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<FacebookPageMetadata>>(pagesJson) ?? new List<FacebookPageMetadata>();
        }
        catch
        {
            return new List<FacebookPageMetadata>();
        }
    }

    private sealed record FacebookPageMetadata(string Id, string? Name, string? AccessToken, string? Category);
}
