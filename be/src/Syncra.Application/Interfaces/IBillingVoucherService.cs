using Syncra.Application.DTOs.Billing;
using Syncra.Application.DTOs.Payments;
using Syncra.Domain.Entities;

namespace Syncra.Application.Interfaces;

public interface IBillingVoucherService
{
    Task<BillingVoucherPreviewResponse> PreviewAsync(
        Guid userId,
        Plan plan,
        string interval,
        string voucherCode,
        CancellationToken cancellationToken = default);

    Task<PaymentDiscount?> ResolveDiscountAsync(
        Guid userId,
        Plan plan,
        string interval,
        string? voucherCode,
        CancellationToken cancellationToken = default);
}
