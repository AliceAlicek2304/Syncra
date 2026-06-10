using Syncra.Domain.Entities;

namespace Syncra.Application.Interfaces;

public interface IRepurposeRepository
{
    Task AddSessionAsync(RepurposeSession session, CancellationToken ct = default);
    Task AddAtomAsync(RepurposeAtom atom, CancellationToken ct = default);
    Task<RepurposeSession?> GetSessionByIdAsync(Guid workspaceId, Guid sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<RepurposeSession>> GetSessionsByWorkspaceIdAsync(Guid workspaceId, CancellationToken ct = default);
    Task DeleteSessionAsync(Guid sessionId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
