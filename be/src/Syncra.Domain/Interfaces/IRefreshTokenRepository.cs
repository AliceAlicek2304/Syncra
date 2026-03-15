using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<RefreshToken>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(RefreshToken entity);
    Task UpdateAsync(RefreshToken entity);
    Task DeleteAsync(Guid id);
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash);
}
