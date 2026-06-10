using Microsoft.EntityFrameworkCore;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public sealed class RepurposeRepository : IRepurposeRepository
{
    private readonly AppDbContext _dbContext;

    public RepurposeRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddSessionAsync(RepurposeSession session, CancellationToken ct = default)
    {
        await _dbContext.RepurposeSessions.AddAsync(session, ct);
    }

    public async Task AddAtomAsync(RepurposeAtom atom, CancellationToken ct = default)
    {
        await _dbContext.RepurposeAtoms.AddAsync(atom, ct);
    }

    public Task<RepurposeSession?> GetSessionByIdAsync(Guid workspaceId, Guid sessionId, CancellationToken ct = default)
    {
        return _dbContext.RepurposeSessions
            .Include(s => s.Atoms)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.WorkspaceId == workspaceId, ct);
    }

    public async Task<IReadOnlyList<RepurposeSession>> GetSessionsByWorkspaceIdAsync(Guid workspaceId, CancellationToken ct = default)
    {
        return await _dbContext.RepurposeSessions
            .Where(s => s.WorkspaceId == workspaceId)
            .OrderByDescending(s => s.CreatedAtUtc)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task DeleteSessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await _dbContext.RepurposeSessions.FindAsync([sessionId], ct);
        if (session is not null)
        {
            _dbContext.RepurposeSessions.Remove(session);
        }
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            foreach (var entry in ex.Entries)
            {
                if (entry.Entity is RepurposeSession || entry.Entity is RepurposeAtom)
                {
                    var databaseValues = await entry.GetDatabaseValuesAsync(ct);
                    if (databaseValues != null)
                    {
                        entry.OriginalValues.SetValues(databaseValues);
                    }
                    else
                    {
                        throw;
                    }
                }
                else
                {
                    throw;
                }
            }
            await _dbContext.SaveChangesAsync(ct);
        }
    }
}
