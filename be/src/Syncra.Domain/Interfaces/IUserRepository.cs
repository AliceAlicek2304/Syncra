using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(User entity);
    Task UpdateAsync(User entity);
    Task DeleteAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByEmailWithOrganizationsAsync(string email);
    Task<User?> GetByIdWithProfileAsync(Guid id);
}
