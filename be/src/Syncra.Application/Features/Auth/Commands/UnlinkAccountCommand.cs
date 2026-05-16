using MediatR;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Auth.Commands;

public record UnlinkAccountCommand(Guid UserId, string Provider) : IRequest;

public sealed class UnlinkAccountCommandHandler : IRequestHandler<UnlinkAccountCommand>
{
    private readonly IExternalLoginRepository _externalLoginRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UnlinkAccountCommandHandler(
        IExternalLoginRepository externalLoginRepository, 
        IUserRepository userRepository,
        IUnitOfWork unitOfWork)
    {
        _externalLoginRepository = externalLoginRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UnlinkAccountCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user == null) throw new DomainException("user_not_found", "User not found.");

        if (request.Provider.Equals("EmailPassword", StringComparison.OrdinalIgnoreCase))
        {
            throw new DomainException("cannot_unlink_primary", "Cannot unlink email/password authentication.");
        }

        var externalLogins = (await _externalLoginRepository.GetByUserIdAsync(request.UserId)).ToList();
        var target = externalLogins.FirstOrDefault(el => el.ProviderName.Equals(request.Provider, StringComparison.OrdinalIgnoreCase));

        if (target == null)
        {
            throw new DomainException("provider_not_linked", $"Provider '{request.Provider}' is not linked to this account.");
        }

        // Safety check: Don't allow unlinking if it's the only login method
        bool hasPassword = !string.IsNullOrEmpty(user.PasswordHash);
        if (!hasPassword && externalLogins.Count <= 1)
        {
            throw new DomainException("cannot_unlink_only_method", "Cannot unlink your only authentication method.");
        }

        await _externalLoginRepository.DeleteAsync(target);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
