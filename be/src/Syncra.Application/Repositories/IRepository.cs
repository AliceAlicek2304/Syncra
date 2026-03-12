using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface IRepository<T> where T : EntityBase
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<T>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(Guid id);
}
