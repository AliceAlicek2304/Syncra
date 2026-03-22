using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed record ConnectIntegrationCommand(
    Guid WorkspaceId,
    string ProviderId,
    string? RedirectUri = null,
    string? EntityType = null,
    string? FrontendRedirectUri = null) : IRequest<string>;
