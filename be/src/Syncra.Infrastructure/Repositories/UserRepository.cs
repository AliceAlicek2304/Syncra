using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByStudentEmailAsync(string studentEmail, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.StudentEmail == studentEmail, cancellationToken);
    }

    public async Task<User?> GetByEmailWithOrganizationsAsync(string email)
    {
        return await _dbSet
            .Include(u => u.WorkspaceMemberships)
            .ThenInclude(om => om.Workspace)
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByIdWithProfileAsync(Guid id)
    {
        return await _dbSet
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetByIdWithProfileAndWorkspacesAsync(Guid id)
    {
        return await _dbSet
            .Include(u => u.Profile)
            .Include(u => u.WorkspaceMemberships)
            .ThenInclude(om => om.Workspace)
            .ThenInclude(w => w.ZernioProfiles)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u.Profile)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }
}
