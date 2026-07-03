using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public sealed class BillingVoucherRepository : IBillingVoucherRepository
{
    private readonly AppDbContext _context;

    public BillingVoucherRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BillingVoucher?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        return await _context.BillingVouchers
            .AsNoTracking()
            .FirstOrDefaultAsync(voucher => voucher.Code.ToUpper() == normalizedCode, cancellationToken);
    }

    public async Task<int> CountRedemptionsAsync(Guid voucherId, CancellationToken cancellationToken = default)
    {
        return await _context.BillingVoucherRedemptions
            .CountAsync(redemption =>
                redemption.VoucherId == voucherId &&
                redemption.Status != "cancelled",
                cancellationToken);
    }

    public async Task<int> CountRedemptionsForUserAsync(Guid voucherId, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.BillingVoucherRedemptions
            .CountAsync(redemption =>
                redemption.VoucherId == voucherId &&
                redemption.UserId == userId &&
                redemption.Status != "cancelled",
                cancellationToken);
    }

    public async Task AddRedemptionAsync(BillingVoucherRedemption redemption, CancellationToken cancellationToken = default)
    {
        await _context.BillingVoucherRedemptions.AddAsync(redemption, cancellationToken);
    }
}
