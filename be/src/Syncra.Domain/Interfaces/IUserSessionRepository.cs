using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IUserSessionRepository
{
    Task<UserSession?> GetByIdAsync(Guid id);
    Task AddAsync(UserSession entity);
    Task UpdateAsync(UserSession entity);
    Task DeleteAsync(Guid id);
}
