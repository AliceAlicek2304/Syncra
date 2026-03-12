using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
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
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IStripeService _stripeService;

    public SubscriptionsController(
        ISubscriptionRepository subscriptionRepository,
        IWorkspaceRepository workspaceRepository,
        IStripeService stripeService)
    {
        _subscriptionRepository = subscriptionRepository;
        _workspaceRepository = workspaceRepository;
        _stripeService = stripeService;
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

    /// <summary>
    /// POST /api/v1/workspaces/{workspaceId}/subscription/create-checkout-session
    /// Creates a Stripe Checkout Session for initiating a subscription.
    /// </summary>
    /// <remarks>
    /// Creates a new Stripe Checkout Session that allows the user to complete
    /// payment and start a subscription. Returns a URL to redirect the user to Stripe.
    /// </remarks>
    /// <param name="workspaceId">The workspace ID</param>
    /// <param name="request">The checkout session request containing the Stripe Price ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The Stripe Checkout Session URL</returns>
    /// <response code="200">Returns the checkout session URL</response>
    /// <response code="400">Invalid request (e.g., missing priceId)</response>
    /// <response code="401">User is not authenticated</response>
    /// <response code="404">Workspace not found</response>
    [HttpPost("create-checkout-session")]
    [ProducesResponseType(typeof(CreateCheckoutSessionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateCheckoutSession(
        Guid workspaceId,
        [FromBody] CreateCheckoutSessionRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PriceId))
        {
            return BadRequest(new { error = "PriceId is required" });
        }

        // Get the workspace
        var workspace = await _workspaceRepository.GetByIdAsync(workspaceId);
        if (workspace is null)
        {
            return NotFound(new { error = "Workspace not found" });
        }

        // Build success and cancel URLs
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var successUrl = request.SuccessUrl ?? $"{baseUrl}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}";
        var cancelUrl = request.CancelUrl ?? $"{baseUrl}/subscription/cancel";

        // Create the checkout session
        var session = await _stripeService.CreateCheckoutSessionAsync(
            workspace,
            request.PriceId,
            successUrl,
            cancelUrl,
            cancellationToken);

        return Ok(new CreateCheckoutSessionResponseDto
        {
            CheckoutUrl = session.Url,
            SessionId = session.Id,
            CustomerId = session.CustomerId,
            ClientReferenceId = session.ClientReferenceId
        });
    }

    /// <summary>
    /// POST /api/v1/workspaces/{workspaceId}/subscription/create-portal-session
    /// Creates a Stripe Customer Portal session for managing a subscription.
    /// </summary>
    /// <remarks>
    /// Creates a new Stripe Customer Portal session that allows the user to manage
    /// their subscription details (e.g., payment methods, invoices, cancel subscription).
    /// Returns a URL to redirect the user to the Stripe-hosted portal.
    /// </remarks>
    /// <param name="workspaceId">The workspace ID</param>
    /// <param name="request">The portal session request containing the return URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The Stripe Customer Portal session URL</returns>
    /// <response code="200">Returns the portal session URL</response>
    /// <response code="401">User is not authenticated</response>
    /// <response code="404">Workspace not found</response>
    [HttpPost("create-portal-session")]
    [ProducesResponseType(typeof(CreatePortalSessionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePortalSession(
        Guid workspaceId,
        [FromBody] CreatePortalSessionRequestDto request,
        CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(workspaceId);
        if (workspace is null)
        { 
            return NotFound(new { error = "Workspace not found" });
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var returnUrl = request.ReturnUrl ?? $"{baseUrl}/settings/billing";

        var portalUrl = await _stripeService.CreatePortalSessionAsync(workspace, returnUrl, cancellationToken);

        return Ok(new CreatePortalSessionResponseDto { PortalUrl = portalUrl });
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

/// <summary>
/// Request DTO for creating a checkout session.
/// </summary>
public class CreateCheckoutSessionRequestDto
{
    /// <summary>
    /// The Stripe Price ID for the subscription plan.
    /// </summary>
    public required string PriceId { get; set; }

    /// <summary>
    /// Optional URL to redirect after successful checkout.
    /// If not provided, a default URL will be used.
    /// </summary>
    public string? SuccessUrl { get; set; }

    /// <summary>
    /// Optional URL to redirect if checkout is cancelled.
    /// If not provided, a default URL will be used.
    /// </summary>
    public string? CancelUrl { get; set; }
}

/// <summary>
/// Response DTO for a created checkout session.
/// </summary>
public class CreateCheckoutSessionResponseDto
{
    /// <summary>
    /// The URL to redirect the user to complete checkout.
    /// </summary>
    public required string CheckoutUrl { get; set; }

    /// <summary>
    /// The Stripe Checkout Session ID.
    /// </summary>
    public required string SessionId { get; set; }

    /// <summary>
    /// The Stripe Customer ID associated with this session.
    /// </summary>
    public string? CustomerId { get; set; }

    /// <summary>
    /// The client reference ID (workspace ID) for this session.
    /// </summary>
    public string? ClientReferenceId { get; set; }
}

/// <summary>
/// Request DTO for creating a customer portal session.
/// </summary>
public class CreatePortalSessionRequestDto
{
    /// <summary>
    /// Optional URL to redirect after the portal session.
    /// If not provided, a default URL will be used.
    /// </summary>
    public string? ReturnUrl { get; set; }
}

/// <summary>
/// Response DTO for a created customer portal session.
/// </summary>
public class CreatePortalSessionResponseDto
{
    /// <summary>
    /// The URL to redirect the user to the Stripe Customer Portal.
    /// </summary>
    public required string PortalUrl { get; set; }
}
