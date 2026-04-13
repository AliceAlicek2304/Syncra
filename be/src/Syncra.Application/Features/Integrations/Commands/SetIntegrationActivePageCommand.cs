using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed record SetIntegrationActivePageCommand(
    Guid WorkspaceId,
    Guid IntegrationId,
    string PageId
) : IRequest<bool>;
