using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using System.Security.Cryptography;
using System.Text;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class VerifyEmailCommandHandler : IRequestHandler<VerifyEmailCommand, AuthResponseDto>
{
    private readonly IEmailVerificationTokenRepository _tokenRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;

    public VerifyEmailCommandHandler(
        IEmailVerificationTokenRepository tokenRepository,
        IUserRepository userRepository,
        IUserSessionRepository userSessionRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions)
    {
        _tokenRepository = tokenRepository;
        _userRepository = userRepository;
        _userSessionRepository = userSessionRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
    }

    public async Task<AuthResponseDto> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        // Hash the token to look it up in the database (per D-03: only hash stored in DB)
        var tokenHash = HashToken(request.Token);
        var token = await _tokenRepository.GetByTokenHashAsync(tokenHash);

        // Validate token: must exist, not expired, not already used
        if (token == null || token.IsExpired || token.IsUsed)
            throw new DomainException("invalid_token", "The verification link is invalid or has expired.");

        var user = token.User;

        // Verify the user's email (sets EmailVerifiedAtUtc)
        user.VerifyEmail();

        // Mark token as used (single-use semantics, per D-04)
        await _tokenRepository.MarkAsUsedAsync(token.Id);

        // Generate new JWT session (auto-login per D-02)
        var jwtToken = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = HashToken(refreshToken);

        // Create user session
        var session = new UserSession
        {
            UserId = user.Id,
            IssuedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays)
        };

        var refreshTokenEntity = new RefreshToken
        {
            TokenHash = refreshTokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            UserSessionId = session.Id
        };

        await _userSessionRepository.AddAsync(session);
        await _refreshTokenRepository.AddAsync(refreshTokenEntity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(jwtToken, refreshToken, session.ExpiresAtUtc);
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
