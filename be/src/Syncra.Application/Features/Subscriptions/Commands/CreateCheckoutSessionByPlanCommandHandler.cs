using MediatR;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.DTOs.Subscriptions;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Commands;

public sealed class CreateCheckoutSessionByPlanCommandHandler
    : IRequestHandler<CreateCheckoutSessionByPlanCommand, CreateCheckoutSessionResponse>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IPaymentProviderResolver _paymentProviderResolver;

    public CreateCheckoutSessionByPlanCommandHandler(
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IPaymentProviderResolver paymentProviderResolver)
    {
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _paymentProviderResolver = paymentProviderResolver;
    }

    public async Task<CreateCheckoutSessionResponse> Handle(
        CreateCheckoutSessionByPlanCommand request,
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

        var plan = await _planRepository.GetByCodeAsync(request.PlanCode, cancellationToken);
        if (plan == null)
        {
            throw new DomainException("not_found", $"Plan '{request.PlanCode}' was not found.");
        }

        if (!plan.IsActive)
        {
            throw new DomainException("plan_inactive", $"Plan '{request.PlanCode}' is not active.");
        }

        var isYearly = string.Equals(request.Interval, "year", StringComparison.OrdinalIgnoreCase);
        var priceId = providerKey.Equals("stripe", StringComparison.OrdinalIgnoreCase)
            ? (isYearly ? plan.StripeYearlyPriceId : plan.StripeMonthlyPriceId)
            : null;

        if (string.IsNullOrWhiteSpace(priceId))
        {
            throw new DomainException(
                "billing_plan_price_missing",
                $"Plan '{request.PlanCode}' does not have a configured price for provider '{providerKey}'.");
        }

        var provider = _paymentProviderResolver.GetRequiredProvider(providerKey);
        var session = await provider.CreateCheckoutSessionAsync(
            new PaymentCheckoutSessionRequest(
                WorkspaceId: workspace.Id,
                WorkspaceName: workspace.Name.ToString(),
                ProviderCustomerId: workspace.BillingCustomerId ?? workspace.StripeCustomerId,
                PriceId: priceId,
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
