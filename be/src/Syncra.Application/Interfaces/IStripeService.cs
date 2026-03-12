using Syncra.Application.DTOs;
using Syncra.Domain.Entities;

namespace Syncra.Application.Interfaces;

public interface IStripeService
{
    /// <summary>
    /// Gets an existing Stripe customer for the workspace or creates a new one.
    /// If the workspace doesn't have a StripeCustomerId, creates a new customer
    /// and saves the ID to the workspace.
    /// </summary>
    /// <param name="workspace">The workspace to get or create a customer for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The Stripe Customer DTO</returns>
    Task<StripeCustomerDto> GetOrCreateCustomerAsync(Workspace workspace, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a Stripe Checkout Session for initiating a subscription.
    /// </summary>
    /// <param name="workspace">The workspace subscribing</param>
    /// <param name="priceId">The Stripe Price ID for the subscription</param>
    /// <param name="successUrl">URL to redirect after successful checkout</param>
    /// <param name="cancelUrl">URL to redirect if checkout is cancelled</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The created Checkout Session DTO</returns>
    Task<StripeCheckoutSessionDto> CreateCheckoutSessionAsync(
        Workspace workspace,
        string priceId,
        string successUrl,
        string cancelUrl,
        CancellationToken cancellationToken = default);
}
