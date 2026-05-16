using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IExternalLoginRepository
{
    Task<ExternalLogin?> GetByProviderAndUserIdAsync(string providerName, string providerUserId);
    Task<IEnumerable<ExternalLogin>> GetByUserIdAsync(Guid userId);
    Task AddAsync(ExternalLogin entity);
    Task UpdateAsync(ExternalLogin entity);
    Task DeleteAsync(ExternalLogin entity);
}
