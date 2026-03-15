using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class UserSessionRepository : Repository<UserSession>, IUserSessionRepository
{
    public UserSessionRepository(AppDbContext context) : base(context) { }
}
