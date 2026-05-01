using MediatR;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.DTOs.Subscriptions;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Commands;

public sealed class CreateCheckoutSessionCommandHandler
    : IRequestHandler<CreateCheckoutSessionCommand, CreateCheckoutSessionResponse>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPaymentProviderResolver _paymentProviderResolver;

    public CreateCheckoutSessionCommandHandler(
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPaymentProviderResolver paymentProviderResolver)
    {
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _paymentProviderResolver = paymentProviderResolver;
    }

    public async Task<CreateCheckoutSessionResponse> Handle(
        CreateCheckoutSessionCommand request,
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
        var session = await provider.CreateCheckoutSessionAsync(
            new PaymentCheckoutSessionRequest(
                WorkspaceId: workspace.Id,
                WorkspaceName: workspace.Name.ToString(),
                ProviderCustomerId: workspace.BillingCustomerId ?? workspace.StripeCustomerId,
                PriceId: request.PriceId,
                SuccessUrl: request.SuccessUrl ?? string.Empty,
                CancelUrl: request.CancelUrl ?? string.Empty),
            cancellationToken);

        return new CreateCheckoutSessionResponse(
            session.CheckoutUrl,
            session.SessionId,
            session.ProviderCustomerId,
            session.ClientReferenceId);
    }
}
