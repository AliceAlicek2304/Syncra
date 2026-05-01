using System.Threading;
using System.Threading.Tasks;
using Syncra.Application.DTOs.Payments;

namespace Syncra.Application.Payments.Handlers;

public interface IPaymentWebhookHandler
{
    string[] SupportedEvents { get; }
    Task HandleAsync(PaymentWebhookEvent webhookEvent, CancellationToken cancellationToken = default);
}
