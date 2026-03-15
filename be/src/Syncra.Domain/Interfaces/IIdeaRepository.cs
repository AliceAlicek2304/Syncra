using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IIdeaRepository
{
    Task<Idea?> GetByIdAsync(Guid id);
    Task<Idea?> GetByIdAsync(Guid id, Guid workspaceId);
    Task<IReadOnlyList<Idea>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Idea entity);
    Task UpdateAsync(Idea entity);
    Task DeleteAsync(Guid id);
    Task<IEnumerable<Idea>> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<(IReadOnlyList<Idea> Items, int TotalCount)> GetFilteredAsync(
        Guid workspaceId,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}