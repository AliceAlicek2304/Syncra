using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Unit>
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IEmailService _emailService;
    private readonly IUnitOfWork _unitOfWork;

    public ChangePasswordCommandHandler(
        IUserRepository userRepository,
        IUserSessionRepository userSessionRepository,
        IEmailService emailService,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _userSessionRepository = userSessionRepository;
        _emailService = emailService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Unit> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Get the user
            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
            {
                throw new DomainException("user_not_found", "User not found.");
            }

            // Verify current password if one has been set
            if (user.HasPasswordBeenSet)
            {
                if (string.IsNullOrEmpty(request.CurrentPassword))
                {
                    throw new DomainException("password_required", "Current password is required.");
                }

                if (!BC.Verify(request.CurrentPassword, user.PasswordHash))
                {
                    throw new DomainException("invalid_password", "Current password is incorrect.");
                }
            }

            // Hash the new password using BCrypt
            var newPasswordHash = BC.HashPassword(request.NewPassword);

            // Update user password via domain method
            user.UpdatePassword(newPasswordHash);
            user.RegenerateSecurityStamp();
            await _userRepository.UpdateAsync(user);

            // Invalidate all existing user sessions for security
            await _userSessionRepository.InvalidateAllForUserAsync(user.Id);

            // Send password changed notification email
            await _emailService.SendPasswordChangedEmailAsync(user, cancellationToken);

            // Save changes
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
        catch (Exception ex)
        {
            // Temporary debug: write full exception to console for diagnosis
            Console.WriteLine("[DEBUG] Exception in ChangePasswordCommandHandler:\n" + ex.ToString());
            throw;
        }
    }
}
