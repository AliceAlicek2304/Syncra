using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IBillingVoucherRepository
{
    Task<BillingVoucher?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<int> CountRedemptionsAsync(Guid voucherId, CancellationToken cancellationToken = default);
    Task<int> CountRedemptionsForUserAsync(Guid voucherId, Guid userId, CancellationToken cancellationToken = default);
    Task AddRedemptionAsync(BillingVoucherRedemption redemption, CancellationToken cancellationToken = default);
}
