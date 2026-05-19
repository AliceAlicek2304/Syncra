using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public record SyncIntegrationPagesCommand(Guid WorkspaceId, Guid IntegrationId) : IRequest;
