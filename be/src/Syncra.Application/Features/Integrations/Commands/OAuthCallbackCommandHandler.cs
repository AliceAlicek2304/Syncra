using System.Text.Json;
using MediatR;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class OAuthCallbackCommandHandler : IRequestHandler<OAuthCallbackCommand, OAuthCallbackResult>
{
    private readonly IEnumerable<ISocialProvider> _providers;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public OAuthCallbackCommandHandler(
        IEnumerable<ISocialProvider> providers,
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork)
    {
        _providers = providers;
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<OAuthCallbackResult> Handle(OAuthCallbackCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(request.State) || !request.State.Contains($"workspaceId={request.WorkspaceId}"))
            throw new DomainException("invalid_state", "Invalid or mismatched state parameter.");

        var stateParams = System.Web.HttpUtility.ParseQueryString(request.State.Replace('&', '?').Split('?')[1] ?? request.State);
        var entityType = stateParams["type"];

        var provider = GetProvider(request.ProviderId);
        var result = await provider.ExchangeCodeAsync(request.Code, request.RedirectUri, request.State, cancellationToken);

        if (!result.IsSuccess)
            throw new DomainException("oauth_failed", BuildProviderErrorMessage(result.Error));

        Integration? integration = null;

        if (!string.IsNullOrWhiteSpace(result.ExternalUserId))
        {
            integration = await _integrationRepository.GetByWorkspacePlatformAndExternalAccountIdAsync(
                request.WorkspaceId,
                request.ProviderId,
                result.ExternalUserId);
        }

        if (integration is null && string.IsNullOrWhiteSpace(result.ExternalUserId))
        {
            // Backward compatibility: if provider does not return an external account id,
            // only reuse the legacy integration when there is exactly one entry on that platform.
            var platformIntegrations = await _integrationRepository.GetByWorkspaceAndPlatformAllAsync(request.WorkspaceId, request.ProviderId);
            if (platformIntegrations.Count == 1)
            {
                integration = platformIntegrations[0];
            }
        }

        if (integration == null)
        {
            integration = Integration.Create(
                request.WorkspaceId, request.ProviderId,
                result.ExternalUserId, result.AccessToken,
                result.RefreshToken, result.ExpiresAt?.UtcDateTime);

            var newMetadata = new Dictionary<string, string>(result.Metadata);
            if (!string.IsNullOrEmpty(entityType))
            {
                newMetadata["type"] = entityType;
            }

            if (newMetadata.Count > 0)
                integration.SetMetadata(JsonSerializer.Serialize(newMetadata));

            await _integrationRepository.AddAsync(integration);
        }
        else
        {
            integration.UpdateTokens(result.AccessToken, result.RefreshToken, result.ExpiresAt?.UtcDateTime);
            integration.Reactivate();

            var existingMetadata = string.IsNullOrEmpty(integration.Metadata)
                ? new Dictionary<string, string>()
                : JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata) ?? new();

            var mergedMetadata = new Dictionary<string, string>(result.Metadata);
            foreach (var kvp in existingMetadata)
            {
                if (!mergedMetadata.ContainsKey(kvp.Key))
                {
                    mergedMetadata[kvp.Key] = kvp.Value;
                }
            }

            if (!string.IsNullOrEmpty(entityType))
            {
                mergedMetadata["type"] = entityType;
            }

            if (mergedMetadata.Count > 0)
                integration.SetMetadata(JsonSerializer.Serialize(mergedMetadata));

            await _integrationRepository.UpdateAsync(integration);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var finalMetadata = string.IsNullOrEmpty(integration.Metadata)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata) ?? new();

        return new OAuthCallbackResult(
            integration.Id,
            request.WorkspaceId,
            request.ProviderId,
            result.ExternalUserId,
            result.ExternalUsername,
            finalMetadata.GetValueOrDefault("channelId"),
            finalMetadata.GetValueOrDefault("channelTitle"),
            finalMetadata.GetValueOrDefault("pageId"),
            finalMetadata.GetValueOrDefault("pageName"));
    }

    private ISocialProvider GetProvider(string providerId) =>
        _providers.FirstOrDefault(p => string.Equals(p.ProviderId, providerId, StringComparison.OrdinalIgnoreCase))
        ?? throw new KeyNotFoundException($"Social provider '{providerId}' is not registered.");

    private static string BuildProviderErrorMessage(Domain.Models.Social.ProviderError? error)
    {
        if (error is null)
        {
            return "OAuth exchange failed.";
        }

        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(error.Code))
        {
            parts.Add(error.Code);
        }

        if (!string.IsNullOrWhiteSpace(error.Message))
        {
            parts.Add(error.Message);
        }

        var message = parts.Count > 0 ? string.Join(": ", parts) : "OAuth exchange failed.";

        if (!string.IsNullOrWhiteSpace(error.Details))
        {
            var details = error.Details.Length > 300 ? error.Details[..300] + "..." : error.Details;
            message = $"{message} (details: {details})";
        }

        return message;
    }
}
