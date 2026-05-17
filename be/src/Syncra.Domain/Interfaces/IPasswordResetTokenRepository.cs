using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<PasswordResetToken>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(PasswordResetToken entity);
    Task UpdateAsync(PasswordResetToken entity);
    Task DeleteAsync(Guid id);
    Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash);
    Task MarkAsUsedAsync(Guid id);
}
