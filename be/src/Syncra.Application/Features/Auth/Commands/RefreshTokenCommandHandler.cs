using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;

    public RefreshTokenCommandHandler(
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions)
    {
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
    }

    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var refreshTokenHash = HashToken(request.RefreshToken);
        var existingToken = await _refreshTokenRepository.GetByTokenHashAsync(refreshTokenHash);

        if (existingToken == null || existingToken.RevokedAtUtc != null || existingToken.ExpiresAtUtc < DateTime.UtcNow)
        {
            throw new DomainException("invalid_token", "Invalid or expired refresh token.");
        }

        var user = existingToken.Session.User;
        var newToken = _tokenService.GenerateJwtToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        var newRefreshTokenHash = HashToken(newRefreshToken);

        // Rotate token
        existingToken.RotatedAtUtc = DateTime.UtcNow;

        var nextRefreshToken = new RefreshToken
        {
            TokenHash = newRefreshTokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            UserSessionId = existingToken.UserSessionId
        };

        existingToken.ReplacedByTokenId = nextRefreshToken.Id;

        await _refreshTokenRepository.AddAsync(nextRefreshToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(newToken, newRefreshToken, existingToken.Session.ExpiresAtUtc);
    }

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}