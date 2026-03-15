using MediatR;
using Syncra.Application.DTOs.Subscriptions;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Commands;

public sealed class CreatePortalSessionCommandHandler
    : IRequestHandler<CreatePortalSessionCommand, CreatePortalSessionResponse>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IStripeService _stripeService;

    public CreatePortalSessionCommandHandler(
        IWorkspaceRepository workspaceRepository,
        IStripeService stripeService)
    {
        _workspaceRepository = workspaceRepository;
        _stripeService = stripeService;
    }

    public async Task<CreatePortalSessionResponse> Handle(
        CreatePortalSessionCommand request,
        CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId)
            ?? throw new DomainException("not_found", "Workspace not found.");

        var portalUrl = await _stripeService.CreatePortalSessionAsync(
            workspace,
            request.ReturnUrl ?? string.Empty,
            cancellationToken);

        return new CreatePortalSessionResponse(portalUrl);
    }
}
