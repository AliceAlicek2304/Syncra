using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class ConnectIntegrationCommandHandler : IRequestHandler<ConnectIntegrationCommand, string>
{
    private readonly IEnumerable<ISocialProvider> _providers;

    public ConnectIntegrationCommandHandler(IEnumerable<ISocialProvider> providers)
    {
        _providers = providers;
    }

    public Task<string> Handle(ConnectIntegrationCommand request, CancellationToken cancellationToken)
    {
        var provider = GetProvider(request.ProviderId);
        var state = $"workspaceId={request.WorkspaceId}";
        if (!string.IsNullOrEmpty(request.EntityType))
        {
            state += $"&type={request.EntityType}";
        }
        if (!string.IsNullOrEmpty(request.FrontendRedirectUri))
        {
            state += $"&frontendRedirectUri={Uri.EscapeDataString(request.FrontendRedirectUri)}";
        }
        var url = provider.GetAuthorizationUrl(state, request.RedirectUri);
        return Task.FromResult(url);
    }

    private ISocialProvider GetProvider(string providerId) =>
        _providers.FirstOrDefault(p => string.Equals(p.ProviderId, providerId, StringComparison.OrdinalIgnoreCase))
        ?? throw new KeyNotFoundException($"Social provider '{providerId}' is not registered.");
}
