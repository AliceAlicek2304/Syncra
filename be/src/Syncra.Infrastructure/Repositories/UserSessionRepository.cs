using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class UserSessionRepository : Repository<UserSession>, IUserSessionRepository
{
    public UserSessionRepository(AppDbContext context) : base(context) { }

    public async Task InvalidateAllForUserAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var activeSessions = await _dbSet
            .Where(s => s.UserId == userId && s.RevokedAtUtc == null)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.Revoke();
        }
    }
}
