using System.Text.Json;
using System.Text.Json.Nodes;
using MediatR;
using Syncra.Application.DTOs.Integrations;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Queries;

public sealed class GetIntegrationPagesQueryHandler : IRequestHandler<GetIntegrationPagesQuery, IReadOnlyList<IntegrationPageDto>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private static readonly HttpClient FacebookGraphClient = new() { Timeout = TimeSpan.FromSeconds(30) };

    public GetIntegrationPagesQueryHandler(IIntegrationRepository integrationRepository, IUnitOfWork unitOfWork)
    {
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<IntegrationPageDto>> Handle(GetIntegrationPagesQuery request, CancellationToken cancellationToken)
    {
        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId);

        if (integration == null || integration.WorkspaceId != request.WorkspaceId)
        {
            return Array.Empty<IntegrationPageDto>();
        }

        var metadata = string.IsNullOrWhiteSpace(integration.Metadata)
            ? new Dictionary<string, string>()
            : ParseMetadata(integration.Metadata);

        if ((!metadata.TryGetValue("pagesJson", out var pagesJson) || string.IsNullOrWhiteSpace(pagesJson))
            && string.Equals(integration.Platform, "facebook", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(integration.AccessToken))
        {
            var fetchedPages = await TryFetchFacebookPagesAsync(integration.AccessToken);
            if (fetchedPages.Count > 0)
            {
                pagesJson = JsonSerializer.Serialize(fetchedPages);
                metadata["pagesJson"] = pagesJson;
                metadata["pageCount"] = fetchedPages.Count.ToString();

                var activePage = fetchedPages[0];
                metadata["pageId"] = activePage.Id;
                if (!string.IsNullOrWhiteSpace(activePage.Name)) metadata["pageName"] = activePage.Name;
                if (!string.IsNullOrWhiteSpace(activePage.AccessToken)) metadata["pageAccessToken"] = activePage.AccessToken;
                if (!string.IsNullOrWhiteSpace(activePage.Category)) metadata["pageCategory"] = activePage.Category;

                integration.SetMetadata(JsonSerializer.Serialize(metadata));
                await _integrationRepository.UpdateAsync(integration);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

        if (!metadata.TryGetValue("pagesJson", out pagesJson) || string.IsNullOrWhiteSpace(pagesJson))
        {
            return Array.Empty<IntegrationPageDto>();
        }

        var activePageId = metadata.GetValueOrDefault("pageId");
        var pages = ParsePages(pagesJson);

        return pages
            .Where(p => !string.IsNullOrWhiteSpace(p.Id))
            .Select(p => new IntegrationPageDto(
                p.Id,
                p.Name,
                p.Category,
                string.Equals(p.Id, activePageId, StringComparison.Ordinal)))
            .ToList();
    }

    private static Dictionary<string, string> ParseMetadata(string metadataJson)
    {
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

    private static async Task<List<FacebookPageMetadata>> TryFetchFacebookPagesAsync(string accessToken)
    {
        try
        {
            var url =
                $"https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category&access_token={Uri.EscapeDataString(accessToken)}";
            var response = await FacebookGraphClient.GetAsync(url, CancellationToken.None);
            if (!response.IsSuccessStatusCode)
            {
                return new List<FacebookPageMetadata>();
            }

            var responseString = await response.Content.ReadAsStringAsync(CancellationToken.None);
            JsonNode? json = null;
            try { json = JsonSerializer.Deserialize<JsonNode>(responseString); } catch { }

            var data = json?["data"]?.AsArray();
            if (data is null || data.Count == 0)
            {
                return new List<FacebookPageMetadata>();
            }

            return data
                .Select(item => new FacebookPageMetadata(
                    item?["id"]?.ToString() ?? string.Empty,
                    item?["name"]?.ToString(),
                    item?["access_token"]?.ToString(),
                    item?["category"]?.ToString()))
                .Where(p => !string.IsNullOrWhiteSpace(p.Id))
                .ToList();
        }
        catch
        {
            return new List<FacebookPageMetadata>();
        }
    }

    private sealed record FacebookPageMetadata(string Id, string? Name, string? AccessToken, string? Category);
}
