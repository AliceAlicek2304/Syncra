using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface IIntegrationRepository : IRepository<Integration>
{
    Task<IEnumerable<Integration>> GetByWorkspaceIdAsync(Guid workspaceId);
    Task<Integration?> GetByWorkspaceAndPlatformAsync(Guid workspaceId, string platform);
}
