using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;

namespace Syncra.Api.Controllers;

/// <summary>
/// Provides subscription management endpoints for workspaces.
/// </summary>
[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/subscription")]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionRepository _subscriptionRepository;

    public SubscriptionsController(ISubscriptionRepository subscriptionRepository)
    {
        _subscriptionRepository = subscriptionRepository;
    }

    /// <summary>
    /// GET /api/v1/workspaces/{workspaceId}/subscription
    /// Gets the current subscription for a workspace.
    /// </summary>
    /// <remarks>
    /// Returns the current subscription state for the specified workspace.
    /// 
    /// **When no subscription exists:**
    /// Returns a default "Free" subscription with `isDefault: true`.
    /// 
    /// **When an active subscription exists:**
    /// Returns the subscription details including plan info, dates, and provider data.
    /// 
    /// **Selection logic:**
    /// - Prefers Active or Trialing subscriptions
    /// - Falls back to most recent subscription by start date
    /// </remarks>
    /// <param name="workspaceId">The workspace ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The current subscription DTO</returns>
    /// <response code="200">Returns the current subscription (or default if none exists)</response>
    /// <response code="401">User is not authenticated</response>
    [HttpGet]
    [ProducesResponseType(typeof(CurrentSubscriptionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentSubscription(
        Guid workspaceId,
        CancellationToken cancellationToken)
    {
        var subscription = await _subscriptionRepository.GetCurrentForWorkspaceAsync(workspaceId);

        if (subscription is null)
        {
            // Return default "Free" subscription when none exists
            return Ok(CurrentSubscriptionDto.Default(workspaceId));
        }

        var dto = MapToDto(subscription);
        return Ok(dto);
    }

    private static CurrentSubscriptionDto MapToDto(Subscription subscription)
    {
        return new CurrentSubscriptionDto
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
}
