using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Domain.Interfaces;

public interface IPostRepository
{
    Task<Post?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Post>> GetByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddAsync(Post entity);
    Task UpdateAsync(Post entity);
    Task DeleteAsync(Guid id);
    Task<Post?> GetByIdWithMediaAsync(Guid id);
    Task<IEnumerable<Post>> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<IEnumerable<Post>> GetByUserIdAsync(Guid userId);
    Task<IReadOnlyList<Post>> GetDueScheduledPostsAsync(
        DateTime utcNow,
        int batchSize,
        CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Post> Items, int TotalCount)> GetFilteredAsync(
        Guid workspaceId,
        PostStatus? status = null,
        DateTime? scheduledFromUtc = null,
        DateTime? scheduledToUtc = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}
