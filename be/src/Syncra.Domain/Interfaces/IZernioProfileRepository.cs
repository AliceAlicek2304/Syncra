using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface IZernioProfileRepository
{
    Task<ZernioProfile?> GetByWorkspaceIdAsync(Guid workspaceId);
}
