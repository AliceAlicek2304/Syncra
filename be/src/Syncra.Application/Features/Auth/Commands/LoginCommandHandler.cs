using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUserSessionRepository userSessionRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _userSessionRepository = userSessionRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
    }

    public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user == null || !BC.Verify(request.Password, user.PasswordHash))
        {
            throw new DomainException("invalid_credentials", "Invalid email or password.");
        }

        // Use domain entity behavior to record login
        user.RecordLogin();

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
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc);
    }

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}