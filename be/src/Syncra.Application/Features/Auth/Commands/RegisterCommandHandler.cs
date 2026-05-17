using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IEmailVerificationTokenRepository _emailVerificationTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;
    private readonly IEmailService _emailService;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUserSessionRepository userSessionRepository,
        IEmailVerificationTokenRepository emailVerificationTokenRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _userSessionRepository = userSessionRepository;
        _emailVerificationTokenRepository = emailVerificationTokenRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
        _emailService = emailService;
    }

    public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var existingUser = await _userRepository.GetByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new DomainException("user_exists", "User with this email already exists.");
        }

        // Use domain entity factory
        var user = User.Create(request.Email, BC.HashPassword(request.Password));

        // Create user profile
        user.Profile = new UserProfile
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            DisplayName = $"{request.FirstName} {request.LastName}"
        };

        await _userRepository.AddAsync(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Generate verification token (32 random bytes, base64url encoded, per D-03 pattern)
        var verificationToken = GenerateToken();
        var verificationTokenHash = HashToken(verificationToken);

        // Create verification token entity (7-day expiry per D-04)
        var emailVerificationToken = new EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = verificationTokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };

        await _emailVerificationTokenRepository.AddAsync(emailVerificationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Send verification email (D-01: email/password path only; D-03: OAuth skipped)
        await _emailService.SendEmailVerificationAsync(user, verificationToken, cancellationToken);

        // Generate tokens
        var token = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = HashToken(refreshToken);

        // Create session and refresh token
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

        return new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc);
    }

    private static string GenerateToken()
    {
        // 32 random bytes, base64url encoded (same as PasswordResetToken pattern from Phase 20)
        var randomBytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}