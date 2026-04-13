using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public record DisconnectIntegrationByIdCommand(
    Guid WorkspaceId,
    Guid IntegrationId
) : IRequest<bool>;
