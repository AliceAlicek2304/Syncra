using MediatR;
using Syncra.Application.DTOs.Subscriptions;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Commands;

public sealed class CreateCheckoutSessionCommandHandler
    : IRequestHandler<CreateCheckoutSessionCommand, CreateCheckoutSessionResponse>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IStripeService _stripeService;

    public CreateCheckoutSessionCommandHandler(
        IWorkspaceRepository workspaceRepository,
        IStripeService stripeService)
    {
        _workspaceRepository = workspaceRepository;
        _stripeService = stripeService;
    }

    public async Task<CreateCheckoutSessionResponse> Handle(
        CreateCheckoutSessionCommand request,
        CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId)
            ?? throw new DomainException("not_found", "Workspace not found.");

        var session = await _stripeService.CreateCheckoutSessionAsync(
            workspace,
            request.PriceId,
            request.SuccessUrl ?? string.Empty,
            request.CancelUrl ?? string.Empty,
            cancellationToken);

        return new CreateCheckoutSessionResponse(
            session.Url,
            session.Id,
            session.CustomerId,
            session.ClientReferenceId);
    }
}
