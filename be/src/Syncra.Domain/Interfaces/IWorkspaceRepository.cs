using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IWorkspaceRepository
{
    Task<Workspace?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Workspace>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Workspace entity);
    Task UpdateAsync(Workspace entity);
    Task DeleteAsync(Guid id);
    Task<Workspace?> GetBySlugAsync(string slug);
    Task<Workspace?> GetBySlugWithMembersAsync(string slug);
    Task<IEnumerable<Workspace>> GetByUserIdAsync(Guid userId);
}
