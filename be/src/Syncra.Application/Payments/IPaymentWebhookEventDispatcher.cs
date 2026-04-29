using Syncra.Application.DTOs.Payments;

namespace Syncra.Application.Payments;

public interface IPaymentWebhookEventDispatcher
{
    Task DispatchAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default);
}
