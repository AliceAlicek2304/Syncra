using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using System.Security.Cryptography;
using System.Text;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class ResendVerificationEmailCommandHandler : IRequestHandler<ResendVerificationEmailCommand, ResendVerificationEmailResponse>
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailVerificationTokenRepository _tokenRepository;
    private readonly IEmailService _emailService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDistributedCache _cache;

    public ResendVerificationEmailCommandHandler(
        IUserRepository userRepository,
        IEmailVerificationTokenRepository tokenRepository,
        IEmailService emailService,
        IUnitOfWork unitOfWork,
        IDistributedCache cache)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _emailService = emailService;
        _unitOfWork = unitOfWork;
        _cache = cache;
    }

    public async Task<ResendVerificationEmailResponse> Handle(ResendVerificationEmailCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.ToUpperInvariant();

        // Rate limit: 1 request per email per 60 seconds (per D-09 pattern from Phase 20)
        var rateLimitKey = $"resend_verify:{normalizedEmail}";
        var lastRequest = await _cache.GetAsync(rateLimitKey, cancellationToken);
        if (lastRequest != null)
        {
            // Always return generic message — never reveal if email exists (D-10 pattern)
            return new ResendVerificationEmailResponse("If an account with that email exists, a verification email has been sent.");
        }

        var user = await _userRepository.GetByEmailAsync(normalizedEmail);

        if (user != null && !user.IsEmailVerified)
        {
            // Revoke old verification tokens (only one valid token per user, per D-01)
            await _tokenRepository.RevokeByUserAsync(user.Id);

            // Generate new verification token (32 random bytes, base64url encoded)
            var rawToken = GenerateToken();
            var tokenHash = HashToken(rawToken);

            var verificationToken = new EmailVerificationToken
            {
                UserId = user.Id,
                TokenHash = tokenHash,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7) // 7-day expiry per D-04
            };

            await _tokenRepository.AddAsync(verificationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Send verification email
            await _emailService.SendEmailVerificationAsync(user, rawToken, cancellationToken);
        }

        // Set rate limit cache entry (60 seconds)
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
        };
        await _cache.SetAsync(rateLimitKey, "1"u8.ToArray(), cacheOptions, cancellationToken);

        // Always return generic message — never reveal if email exists
        return new ResendVerificationEmailResponse("If an account with that email exists, a verification email has been sent.");
    }

    private static string GenerateToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
