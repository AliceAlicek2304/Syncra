using Microsoft.EntityFrameworkCore;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class RefreshTokenRepository : Repository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
    {
        return await _dbSet
            .Include(x => x.Session)
            .ThenInclude(s => s.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash);
    }
}
