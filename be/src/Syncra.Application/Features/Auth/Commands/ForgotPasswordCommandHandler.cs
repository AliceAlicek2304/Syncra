using System.Security.Cryptography;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.Interfaces;
using Syncra.Application.Common.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, ForgotPasswordResponse>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IEmailService _emailService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDistributedCache _cache;

    public ForgotPasswordCommandHandler(
        IUserRepository userRepository,
        IPasswordResetTokenRepository tokenRepository,
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

    public async Task<ForgotPasswordResponse> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.ToUpperInvariant();

        // Rate limit: 1 request per email per 60 seconds (D-09)
        // Check before DB lookup to avoid unnecessary queries and timing side-channels
        var rateLimitKey = $"reset_pwd:{normalizedEmail}";
        var lastRequest = await _cache.GetAsync(rateLimitKey, cancellationToken);
        if (lastRequest != null)
        {
            // Still return generic message — never reveal if email exists (D-10)
            return new ForgotPasswordResponse("If an account with that email exists, a password reset link has been sent.");
        }

        var user = await _userRepository.GetByEmailAsync(normalizedEmail);

        if (user != null)
        {
            // Generate cryptographically random token (256 bits, per D-03)
            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var rawToken = Convert.ToBase64String(tokenBytes)
                .Replace("/", "_")
                .Replace("+", "-")
                .TrimEnd('=');

            // Hash the token for storage (SHA256, per D-03/D-11)
            var tokenHash = HashToken(rawToken);

            var resetToken = new PasswordResetToken
            {
                UserId = user.Id,
                TokenHash = tokenHash,
                ExpiresAtUtc = DateTime.UtcNow.AddHours(1), // 1 hour expiry (D-04)
                CreatedAtUtc = DateTime.UtcNow
            };

            await _tokenRepository.AddAsync(resetToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Send email via Postmark (D-01, D-13)
            await _emailService.SendPasswordResetEmailAsync(user, rawToken, cancellationToken);
        }

        // Set rate limit cache entry (60 seconds, D-09)
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
        };
        await _cache.SetAsync(rateLimitKey, "1"u8.ToArray(), cacheOptions, cancellationToken);

        // Always return generic message — never reveal if email exists (D-10)
        return new ForgotPasswordResponse("If an account with that email exists, a password reset link has been sent.");
    }

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
