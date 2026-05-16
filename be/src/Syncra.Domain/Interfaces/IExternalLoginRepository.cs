using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IExternalLoginRepository
{
    Task<ExternalLogin?> GetByProviderAndUserIdAsync(string providerName, string providerUserId);
    Task AddAsync(ExternalLogin entity);
    Task UpdateAsync(ExternalLogin entity);
}
