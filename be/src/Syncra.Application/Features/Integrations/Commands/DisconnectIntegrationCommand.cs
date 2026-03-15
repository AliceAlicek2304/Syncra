using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public record DisconnectIntegrationCommand(
    Guid WorkspaceId,
    string ProviderId
) : IRequest<bool>;