using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<IEnumerable<Post>> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<IEnumerable<Post>> GetByUserIdAsync(Guid userId);
    Task<IReadOnlyList<Post>> GetDueScheduledPostsAsync(
        DateTime utcNow,
        int batchSize,
        CancellationToken cancellationToken = default);
}
