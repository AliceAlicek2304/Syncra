using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Repositories;

public class SocialAccountRepository : Repository<SocialAccount>, ISocialAccountRepository
{
    public SocialAccountRepository(AppDbContext context) : base(context)
    {
    }
}
