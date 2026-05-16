using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class ExternalLoginRepository : Repository<ExternalLogin>, IExternalLoginRepository
{
    public ExternalLoginRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<ExternalLogin?> GetByProviderAndUserIdAsync(string providerName, string providerUserId)
    {
        return await _dbSet
            .Include(el => el.User)
            .ThenInclude(u => u.Profile)
            .FirstOrDefaultAsync(el => el.ProviderName == providerName && el.ProviderUserId == providerUserId);
    }

    public async Task<IEnumerable<ExternalLogin>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet
            .Where(el => el.UserId == userId)
            .ToListAsync();
    }

    public async Task AddAsync(ExternalLogin entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public Task UpdateAsync(ExternalLogin entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ExternalLogin entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }
}
