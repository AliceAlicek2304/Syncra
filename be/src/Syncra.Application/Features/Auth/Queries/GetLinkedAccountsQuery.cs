using MediatR;
using Syncra.Application.DTOs.Auth;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Auth.Queries;

public record GetLinkedAccountsQuery(Guid UserId) : IRequest<IEnumerable<LinkedAccountDto>>;

public sealed class GetLinkedAccountsQueryHandler : IRequestHandler<GetLinkedAccountsQuery, IEnumerable<LinkedAccountDto>>
{
    private readonly IExternalLoginRepository _externalLoginRepository;
    private readonly IUserRepository _userRepository;

    public GetLinkedAccountsQueryHandler(IExternalLoginRepository externalLoginRepository, IUserRepository userRepository)
    {
        _externalLoginRepository = externalLoginRepository;
        _userRepository = userRepository;
    }

    public async Task<IEnumerable<LinkedAccountDto>> Handle(GetLinkedAccountsQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user == null) throw new Domain.Exceptions.DomainException("user_not_found", "User not found.");

        var linkedAccounts = new List<LinkedAccountDto>();

        // Always include Email/Password if PasswordHash is present
        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            linkedAccounts.Add(new LinkedAccountDto("EmailPassword", null, user.CreatedAtUtc));
        }

        var externalLogins = await _externalLoginRepository.GetByUserIdAsync(request.UserId);
        foreach (var externalLogin in externalLogins)
        {
            linkedAccounts.Add(new LinkedAccountDto(externalLogin.ProviderName, externalLogin.ProviderUserId, externalLogin.CreatedAtUtc));
        }

        return linkedAccounts;
    }
}
