using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IBillingPaymentRepository
{
    Task AddAsync(BillingPayment payment, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string provider, string providerPaymentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BillingPayment>> GetAllAsync(CancellationToken cancellationToken = default);
}
