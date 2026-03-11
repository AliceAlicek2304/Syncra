using Syncra.Domain.Entities;

namespace Syncra.Application.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByEmailWithOrganizationsAsync(string email);
    Task<User?> GetByIdWithProfileAsync(Guid id);
}
