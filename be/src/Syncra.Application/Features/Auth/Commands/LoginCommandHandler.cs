using MediatR;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Enums;
using Syncra.Application.Features.Subscriptions.Commands;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IPaymentProviderResolver _paymentProviderResolver;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;
    private readonly IMediator _mediator;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUserSessionRepository userSessionRepository,
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IPaymentProviderResolver paymentProviderResolver,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions,
        IMediator mediator)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _userSessionRepository = userSessionRepository;
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _paymentProviderResolver = paymentProviderResolver;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
        _mediator = mediator;
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

        // Get user's default workspace
        var workspaces = await _workspaceRepository.GetByUserIdAsync(user.Id);
        var workspace = System.Linq.Enumerable.FirstOrDefault(workspaces);

        string? checkoutUrl = null;

        if (workspace != null && !string.IsNullOrWhiteSpace(request.Plan))
        {
            var plan = await _planRepository.GetByCodeAsync(request.Plan.ToUpper(), cancellationToken);
            if (plan != null && plan.IsActive)
            {
                if (string.Equals(plan.Code, "STUDENT", StringComparison.OrdinalIgnoreCase))
                {
                    plan = null;
                }
            }

            if (plan != null && plan.IsActive)
            {
                if (string.Equals(request.Flow, "trial", StringComparison.OrdinalIgnoreCase))
                {
                    var existingSub = await _subscriptionRepository.GetByWorkspaceIdAsync(workspace.Id);
                    if (existingSub != null && !existingSub.TrialEndsAtUtc.HasValue)
                    {
                        var startTrialCommand = new StartTrialCommand(workspace.Id, user.Id, plan.Code);
                        await _mediator.Send(startTrialCommand, cancellationToken);
                    }
                }
                else if (string.Equals(request.Flow, "checkout", StringComparison.OrdinalIgnoreCase))
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
                                ProviderCustomerId: workspace.BillingCustomerId ?? workspace.StripeCustomerId,
                                PriceId: priceId,
                                SuccessUrl: successUrl,
                                CancelUrl: cancelUrl,
                                Interval: "month",
                                SkipTrial: true),
                            cancellationToken);

                        checkoutUrl = checkoutResult.CheckoutUrl;
                    }
                }
            }
        }

        await _userSessionRepository.AddAsync(session);
        await _refreshTokenRepository.AddAsync(refreshTokenEntity);
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc, checkoutUrl);
    }

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
