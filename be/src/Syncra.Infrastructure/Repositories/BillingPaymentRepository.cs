using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public sealed class BillingPaymentRepository : IBillingPaymentRepository
{
    private readonly AppDbContext _context;

    public BillingPaymentRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task AddAsync(BillingPayment payment, CancellationToken cancellationToken = default)
    {
        _context.BillingPayments.Add(payment);
        return Task.CompletedTask;
    }

    public async Task<bool> ExistsAsync(string provider, string providerPaymentId, CancellationToken cancellationToken = default)
    {
        return await _context.BillingPayments.AnyAsync(
            payment => payment.Provider == provider && payment.ProviderPaymentId == providerPaymentId,
            cancellationToken);
    }

    public async Task<IReadOnlyList<BillingPayment>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.BillingPayments
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }
}
