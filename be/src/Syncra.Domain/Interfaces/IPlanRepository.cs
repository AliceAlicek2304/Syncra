using System.Threading;
using System.Threading.Tasks;
using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IPlanRepository
{
    Task<Plan?> GetByStripePriceIdAsync(string stripePriceId, CancellationToken cancellationToken = default);
    Task<Plan?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
}
