using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed record ConnectIntegrationCommand(
    Guid WorkspaceId,
    string ProviderId,
    string? RedirectUri = null) : IRequest<string>;
