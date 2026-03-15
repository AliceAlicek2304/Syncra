using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Queries;

public sealed class GetCurrentSubscriptionQueryHandler
    : IRequestHandler<GetCurrentSubscriptionQuery, CurrentSubscriptionDto>
{
    private readonly ISubscriptionRepository _subscriptionRepository;

    public GetCurrentSubscriptionQueryHandler(ISubscriptionRepository subscriptionRepository)
    {
        _subscriptionRepository = subscriptionRepository;
    }

    public async Task<CurrentSubscriptionDto> Handle(
        GetCurrentSubscriptionQuery request,
        CancellationToken cancellationToken)
    {
        var subscription = await _subscriptionRepository.GetCurrentForWorkspaceAsync(request.WorkspaceId);

        if (subscription is null)
            return CurrentSubscriptionDto.Default(request.WorkspaceId);

        return MapToDto(subscription);
    }

    private static CurrentSubscriptionDto MapToDto(Subscription subscription) => new()
    {
        Status = subscription.Status.ToString(),
        PlanCode = subscription.Plan?.Code,
        PlanName = subscription.Plan?.Name,
        StartedAtUtc = subscription.StartsAtUtc,
        EndsAtUtc = subscription.EndsAtUtc,
        TrialEndsAtUtc = subscription.TrialEndsAtUtc,
        CanceledAtUtc = subscription.CanceledAtUtc,
        Provider = subscription.Provider,
        ProviderCustomerId = subscription.ProviderCustomerId,
        ProviderSubscriptionId = subscription.ProviderSubscriptionId,
        IsDefault = false
    };
}
