using MediatR;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.DTOs.Subscriptions;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Commands;

public sealed class CreatePortalSessionCommandHandler
    : IRequestHandler<CreatePortalSessionCommand, CreatePortalSessionResponse>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPaymentProviderResolver _paymentProviderResolver;

    public CreatePortalSessionCommandHandler(
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPaymentProviderResolver paymentProviderResolver)
    {
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _paymentProviderResolver = paymentProviderResolver;
    }

    public async Task<CreatePortalSessionResponse> Handle(
        CreatePortalSessionCommand request,
        CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId)
            ?? throw new DomainException("not_found", "Workspace not found.");

        if (workspace.OwnerUserId != request.UserId)
        {
            throw new DomainException("forbidden", "Only the workspace owner can manage billing.");
        }

        var subscription = await _subscriptionRepository.GetByWorkspaceIdAsync(workspace.Id);
        var providerKey = !string.IsNullOrWhiteSpace(subscription?.Provider)
            ? subscription.Provider!
            : !string.IsNullOrWhiteSpace(workspace.BillingProvider)
                ? workspace.BillingProvider
                : _paymentProviderResolver.GetDefaultProviderKey();

        var provider = _paymentProviderResolver.GetRequiredProvider(providerKey);
        var portalResult = await provider.CreatePortalSessionAsync(
            new PaymentPortalSessionRequest(
                WorkspaceId: workspace.Id,
                WorkspaceName: workspace.Name.ToString(),
                ProviderCustomerId: workspace.BillingCustomerId ?? workspace.StripeCustomerId,
                ReturnUrl: request.ReturnUrl ?? string.Empty),
            cancellationToken);

        return new CreatePortalSessionResponse(portalResult.PortalUrl);
    }
}
