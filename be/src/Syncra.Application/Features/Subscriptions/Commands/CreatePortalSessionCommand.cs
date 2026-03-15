using MediatR;
using Syncra.Application.DTOs.Subscriptions;

namespace Syncra.Application.Features.Subscriptions.Commands;

public record CreatePortalSessionCommand(
    Guid WorkspaceId,
    string? ReturnUrl) : IRequest<CreatePortalSessionResponse>;
