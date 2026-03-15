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

        var provider = GetProvider(request.ProviderId);
        var result = await provider.ExchangeCodeAsync(request.Code, request.RedirectUri, cancellationToken);

        if (!result.IsSuccess)
            throw new DomainException("oauth_failed", result.Error?.ToString() ?? "OAuth exchange failed.");

        var integration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(request.WorkspaceId, request.ProviderId);
        if (integration == null)
        {
            integration = Integration.Create(
                request.WorkspaceId, request.ProviderId,
                result.ExternalUserId, result.AccessToken,
                result.RefreshToken, result.ExpiresAt?.UtcDateTime);

            if (result.Metadata.Count > 0)
                integration.SetMetadata(JsonSerializer.Serialize(result.Metadata));

            await _integrationRepository.AddAsync(integration);
        }
        else
        {
            integration.UpdateTokens(result.AccessToken, result.RefreshToken, result.ExpiresAt?.UtcDateTime);
            integration.Reactivate();

            if (result.Metadata.Count > 0)
                integration.SetMetadata(JsonSerializer.Serialize(result.Metadata));

            await _integrationRepository.UpdateAsync(integration);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var metadata = string.IsNullOrEmpty(integration.Metadata)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata) ?? new();

        return new OAuthCallbackResult(
            integration.Id,
            request.WorkspaceId,
            request.ProviderId,
            result.ExternalUserId,
            result.ExternalUsername,
            metadata.GetValueOrDefault("channelId"),
            metadata.GetValueOrDefault("channelTitle"),
            metadata.GetValueOrDefault("pageId"),
            metadata.GetValueOrDefault("pageName"));
    }

    private ISocialProvider GetProvider(string providerId) =>
        _providers.FirstOrDefault(p => string.Equals(p.ProviderId, providerId, StringComparison.OrdinalIgnoreCase))
        ?? throw new KeyNotFoundException($"Social provider '{providerId}' is not registered.");
}
