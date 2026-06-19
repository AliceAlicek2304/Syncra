using System.Text.RegularExpressions;
using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Enums;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IEmailVerificationTokenRepository _emailVerificationTokenRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IPaymentProviderResolver _paymentProviderResolver;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;
    private readonly IEmailService _emailService;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUserSessionRepository userSessionRepository,
        IEmailVerificationTokenRepository emailVerificationTokenRepository,
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IPaymentProviderResolver paymentProviderResolver,
        IZernioProfileRepository zernioProfileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _userSessionRepository = userSessionRepository;
        _emailVerificationTokenRepository = emailVerificationTokenRepository;
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _paymentProviderResolver = paymentProviderResolver;
        _zernioProfileRepository = zernioProfileRepository;
        _zernioClient = zernioClient;
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

        // Create default workspace + ZernioProfile for the new user
        var workspace = await CreateDefaultWorkspaceAsync(user, request.Flow, request.Plan, cancellationToken);

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

        string? checkoutUrl = null;
        if (string.Equals(request.Flow, "checkout", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(request.Plan))
        {
            var plan = await _planRepository.GetByCodeAsync(request.Plan.ToUpper(), cancellationToken);
            if (plan != null && plan.IsActive)
            {
                var providerKey = _paymentProviderResolver.GetDefaultProviderKey();
                var provider = _paymentProviderResolver.GetRequiredProvider(providerKey);

                var priceId = providerKey.Equals("stripe", StringComparison.OrdinalIgnoreCase)
                    ? plan.StripeMonthlyPriceId
                    : plan.Id.ToString();

                if (!string.IsNullOrWhiteSpace(priceId))
                {
                    var origin = "http://localhost:5173";
                    var successUrl = $"{origin}/app/connections?billing=success";
                    var cancelUrl = $"{origin}/app/connections?billing=cancel";

                    var checkoutResult = await provider.CreateCheckoutSessionAsync(
                        new PaymentCheckoutSessionRequest(
                            WorkspaceId: workspace.Id,
                            WorkspaceName: workspace.Name.ToString(),
                            ProviderCustomerId: null,
                            PriceId: priceId,
                            SuccessUrl: successUrl,
                            CancelUrl: cancelUrl,
                            SkipTrial: true),
                        cancellationToken);

                    checkoutUrl = checkoutResult.CheckoutUrl;
                }
            }
        }

        return new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc, checkoutUrl);
    }

    private async Task<Workspace> CreateDefaultWorkspaceAsync(User user, string? flow, string? planCode, CancellationToken cancellationToken)
    {
        var emailPrefix = user.Email.Value.Split('@')[0];
        var slug = GenerateSlug(emailPrefix);

        var existing = await _workspaceRepository.GetBySlugAsync(slug);
        if (existing != null)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";
        }

        var workspace = Workspace.Create(user.Id, "Default", slug);
        workspace.AddMember(user.Id, "owner");
        workspace.Members.First().Activate();

        await _workspaceRepository.AddAsync(workspace);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (string.Equals(flow, "trial", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(planCode))
        {
            var plan = await _planRepository.GetByCodeAsync(planCode.ToUpper(), cancellationToken);
            if (plan != null && plan.IsActive)
            {
                var subscription = new Subscription
                {
                    WorkspaceId = workspace.Id,
                    PlanId = plan.Id,
                    Status = SubscriptionStatus.Trialing,
                    StartsAtUtc = DateTime.UtcNow,
                    EndsAtUtc = null,
                    TrialEndsAtUtc = DateTime.UtcNow.AddDays(14),
                    CanceledAtUtc = null,
                    LastEventTimestampUtc = DateTime.UtcNow
                };
                await _subscriptionRepository.AddAsync(subscription);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

        var zernioName = $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";
        var provisioned = await _zernioClient.ProvisionProfileAsync(
            workspaceId: workspace.Id.ToString(),
            name: zernioName,
            cancellationToken: cancellationToken);

        var profile = ZernioProfile.Create(
            workspaceId: workspace.Id,
            zernioProfileId: provisioned.Id,
            displayName: provisioned.Name,
            platform: "zernio");

        await _zernioProfileRepository.AddAsync(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return workspace;
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = Regex.Replace(slug, @"-{2,}", "-").Trim('-');
        if (slug.Length == 0) return "workspace";
        if (slug.Length < 3) slug = slug.PadRight(3, '0');
        return slug;
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