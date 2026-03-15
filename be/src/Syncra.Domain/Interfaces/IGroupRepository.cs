using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetByIdAsync(Guid id);
    Task<Group?> GetByIdAsync(Guid id, Guid workspaceId);
    Task<IReadOnlyList<Group>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Group entity);
    Task UpdateAsync(Group entity);
    Task DeleteAsync(Guid id);
    Task<IEnumerable<Group>> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<bool> ExistsWithNameAsync(Guid workspaceId, string name, Guid? excludeId = null);
}
