using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IZernioProfileRepository
{
    Task<ZernioProfile?> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<IReadOnlyList<ZernioProfile>> GetByWorkspaceIdsAsync(IReadOnlyCollection<Guid> workspaceIds);
    Task AddAsync(ZernioProfile profile);
}
