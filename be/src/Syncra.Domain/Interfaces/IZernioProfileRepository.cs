using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IZernioProfileRepository
{
    Task<ZernioProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ZernioProfile?> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<IReadOnlyList<ZernioProfile>> GetByWorkspaceIdsAsync(IReadOnlyCollection<Guid> workspaceIds);
    Task<IReadOnlyList<ZernioProfile>> GetActiveByWorkspaceIdAsync(Guid workspaceId);
    Task<IReadOnlyList<ZernioProfile>> GetAllActiveAsync();
    Task AddAsync(ZernioProfile profile);
}
