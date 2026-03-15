using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IIntegrationRepository
{
    Task<Integration?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Integration>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Integration entity);
    Task UpdateAsync(Integration entity);
    Task DeleteAsync(Guid id);
    Task<IEnumerable<Integration>> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<Integration?> GetByWorkspaceAndPlatformAsync(Guid workspaceId, string platform);
    Task<IReadOnlyList<Integration>> GetAllAsync();
}
