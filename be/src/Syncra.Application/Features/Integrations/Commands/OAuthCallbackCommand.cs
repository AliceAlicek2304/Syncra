using MediatR;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed record OAuthCallbackCommand(
    Guid WorkspaceId,
    string ProviderId,
    string Code,
    string State,
    string? RedirectUri = null) : IRequest<OAuthCallbackResult>;

public sealed record OAuthCallbackResult(
    Guid IntegrationId,
    Guid WorkspaceId,
    string ProviderId,
    string? ExternalUserId,
    string? ExternalUsername,
    string? ChannelId,
    string? ChannelTitle,
    string? PageId,
    string? PageName);
