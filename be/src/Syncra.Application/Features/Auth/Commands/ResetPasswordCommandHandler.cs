using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Unit>
{
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _sessionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ResetPasswordCommandHandler(
        IPasswordResetTokenRepository tokenRepository,
        IUserRepository userRepository,
        IUserSessionRepository sessionRepository,
        IUnitOfWork unitOfWork)
    {
        _tokenRepository = tokenRepository;
        _userRepository = userRepository;
        _sessionRepository = sessionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Unit> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        // Hash the incoming token to look up in DB (D-11)
        var tokenHash = HashToken(request.Token);

        var resetToken = await _tokenRepository.GetByTokenHashAsync(tokenHash);

        // Generic invalid/expired error (D-12) — don't reveal WHICH condition failed
        if (resetToken == null || !resetToken.IsValid)
        {
            throw new DomainException("invalid_reset_token", "The reset link is invalid or has expired.");
        }

        // Hash new password with BCrypt
        var newPasswordHash = BC.HashPassword(request.NewPassword);

        // Update user password via domain method
        resetToken.User.UpdatePassword(newPasswordHash);
        resetToken.User.RegenerateSecurityStamp();
        await _userRepository.UpdateAsync(resetToken.User);

        // Mark token as used (single-use, D-04/D-12)
        resetToken.MarkAsUsed();
        await _tokenRepository.UpdateAsync(resetToken);

        // Invalidate all existing user sessions for security
        await _sessionRepository.InvalidateAllForUserAsync(resetToken.UserId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
