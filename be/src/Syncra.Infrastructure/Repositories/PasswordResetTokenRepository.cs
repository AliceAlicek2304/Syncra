using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class PasswordResetTokenRepository : Repository<PasswordResetToken>, IPasswordResetTokenRepository
{
    public PasswordResetTokenRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash)
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
}
