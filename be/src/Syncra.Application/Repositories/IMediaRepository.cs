using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface IMediaRepository : IRepository<Media>
{
    Task<(IEnumerable<Media> Items, int TotalCount)> GetByWorkspaceIdAsync(
        Guid workspaceId,
        string? mediaType = null,
        bool? isAttached = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}
