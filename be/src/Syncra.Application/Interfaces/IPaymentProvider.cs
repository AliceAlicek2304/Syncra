using Syncra.Application.DTOs.Payments;

namespace Syncra.Application.Interfaces;

public interface IPaymentProvider
{
    string ProviderKey { get; }

    Task<PaymentCheckoutSessionResult> CreateCheckoutSessionAsync(
        PaymentCheckoutSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentPortalSessionResult> CreatePortalSessionAsync(
        PaymentPortalSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentWebhookParseResult> ParseWebhookAsync(
        PaymentWebhookRequest request,
        CancellationToken cancellationToken = default);
}
