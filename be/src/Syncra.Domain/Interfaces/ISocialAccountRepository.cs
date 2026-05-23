using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface ISocialAccountRepository
{
    Task<SocialAccount?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<SocialAccount>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(SocialAccount entity);
    Task UpdateAsync(SocialAccount entity);
    Task DeleteAsync(Guid id);
}
