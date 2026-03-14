using Syncra.Domain.Entities;

namespace Syncra.Application.Interfaces;

public interface ITokenService
{
    string GenerateJwtToken(User user);
    string GenerateRefreshToken();
}
