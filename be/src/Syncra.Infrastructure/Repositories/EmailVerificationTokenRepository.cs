using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class EmailVerificationTokenRepository : Repository<EmailVerificationToken>, IEmailVerificationTokenRepository
{
    public EmailVerificationTokenRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<EmailVerificationToken?> GetByTokenHashAsync(string tokenHash)
    {
        return await _dbSet
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash);
    }

    public async Task MarkAsUsedAsync(Guid id)
    {
        var entity = await _dbSet.FindAsync(id);
        if (entity != null)
        {
            entity.MarkAsUsed();
            _dbSet.Update(entity);
        }
    }

    public async Task RevokeByUserAsync(Guid userId)
    {
        // Mark all non-used tokens for this user as used (revoke them)
        var tokens = await _dbSet
            .Where(x => x.UserId == userId && !x.UsedAtUtc.HasValue)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.MarkAsUsed();
        }

        if (tokens.Count > 0)
        {
            _dbSet.UpdateRange(tokens);
        }
    }
}
