using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IEmailVerificationTokenRepository
{
    Task<EmailVerificationToken?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<EmailVerificationToken>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(EmailVerificationToken entity);
    Task UpdateAsync(EmailVerificationToken entity);
    Task DeleteAsync(Guid id);
    Task<EmailVerificationToken?> GetByTokenHashAsync(string tokenHash);
    Task MarkAsUsedAsync(Guid id);
    /// <summary>
    /// Revoke all verification tokens for a user (used when resending a new token).
    /// Per decision: only one valid token per user at a time (revoke old on resend).
    /// </summary>
    Task RevokeByUserAsync(Guid userId);
}
