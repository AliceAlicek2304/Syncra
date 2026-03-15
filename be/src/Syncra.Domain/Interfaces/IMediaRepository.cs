using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IMediaRepository
{
    Task<Media?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Media>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Media entity);
    Task UpdateAsync(Media entity);
    Task DeleteAsync(Guid id);
    Task<(IEnumerable<Media> Items, int TotalCount)> GetByWorkspaceIdAsync(
        Guid workspaceId,
        string? mediaType = null,
        bool? isAttached = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}
