using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class PlanRepository : IPlanRepository
{
    private readonly AppDbContext _context;

    public PlanRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Plan?> GetByStripePriceIdAsync(string stripePriceId, CancellationToken cancellationToken = default)
    {
        return await _context.Plans
            .FirstOrDefaultAsync(p => p.StripeMonthlyPriceId == stripePriceId || p.StripeYearlyPriceId == stripePriceId, cancellationToken);
    }

    public async Task<Plan?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await _context.Plans
            .FirstOrDefaultAsync(p => p.Code == code, cancellationToken);
    }

    public async Task<Plan?> GetByStripeProductIdAsync(string stripeProductId, CancellationToken cancellationToken = default)
    {
        return await _context.Plans
            .FirstOrDefaultAsync(p => p.StripeProductId == stripeProductId, cancellationToken);
    }

    public Task AddAsync(Plan plan, CancellationToken cancellationToken = default)
    {
        _context.Plans.Add(plan);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Plan plan, CancellationToken cancellationToken = default)
    {
        _context.Plans.Update(plan);
        return Task.CompletedTask;
    }
}
