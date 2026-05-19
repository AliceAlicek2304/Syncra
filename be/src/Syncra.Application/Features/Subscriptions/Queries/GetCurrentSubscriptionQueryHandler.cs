using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Queries;

public sealed class GetCurrentSubscriptionQueryHandler
    : IRequestHandler<GetCurrentSubscriptionQuery, CurrentSubscriptionDto>
{
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IWorkspaceRepository _workspaceRepository;

    public GetCurrentSubscriptionQueryHandler(
        ISubscriptionRepository subscriptionRepository,
        IWorkspaceRepository workspaceRepository)
    {
        _subscriptionRepository = subscriptionRepository;
        _workspaceRepository = workspaceRepository;
    }

    public async Task<CurrentSubscriptionDto> Handle(
        GetCurrentSubscriptionQuery request,
        CancellationToken cancellationToken)
    {
        var subscription = await _subscriptionRepository.GetCurrentForWorkspaceAsync(request.WorkspaceId);
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId);

        var dto = subscription is null
            ? CurrentSubscriptionDto.Default(request.WorkspaceId)
            : MapToDto(subscription);

        if (workspace != null)
        {
            dto.CurrentScheduledPostsThisMonth = workspace.GetUsageCount("scheduled_posts");
        }

        return dto;
    }

    private static CurrentSubscriptionDto MapToDto(Subscription subscription) => new()
    {
        Status = subscription.Status.ToString(),
        PlanCode = subscription.Plan?.Code,
        PlanName = subscription.Plan?.Name,
        MaxSocialAccounts = subscription.Plan?.MaxSocialAccounts,
        MaxScheduledPostsPerMonth = subscription.Plan?.MaxScheduledPostsPerMonth,
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
