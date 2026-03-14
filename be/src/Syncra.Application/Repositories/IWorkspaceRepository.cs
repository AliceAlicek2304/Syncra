using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface IWorkspaceRepository : IRepository<Workspace>
{
    Task<Workspace?> GetBySlugAsync(string slug);
    Task<Workspace?> GetBySlugWithMembersAsync(string slug);
    Task<IEnumerable<Workspace>> GetByUserIdAsync(Guid userId);
}
