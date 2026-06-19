using System.Text.RegularExpressions;
using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class OAuthLoginCommandHandler : IRequestHandler<OAuthLoginCommand, AuthResponseDto>
{
    private readonly IEnumerable<IOAuthProvider> _providers;
    private readonly IUserRepository _userRepository;
    private readonly IExternalLoginRepository _externalLoginRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;
    private readonly ILogger<OAuthLoginCommandHandler> _logger;

    public OAuthLoginCommandHandler(
        IEnumerable<IOAuthProvider> providers,
        IUserRepository userRepository,
        IExternalLoginRepository externalLoginRepository,
        IWorkspaceRepository workspaceRepository,
        IZernioProfileRepository zernioProfileRepository,
        IZernioClient zernioClient,
        IUserSessionRepository userSessionRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions,
        ILogger<OAuthLoginCommandHandler> logger)
    {
        _providers = providers;
        _userRepository = userRepository;
        _externalLoginRepository = externalLoginRepository;
        _workspaceRepository = workspaceRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _zernioClient = zernioClient;
        _userSessionRepository = userSessionRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
        _logger = logger;
    }

    public async Task<AuthResponseDto> Handle(OAuthLoginCommand request, CancellationToken cancellationToken)
    {
        var provider = _providers.FirstOrDefault(p => p.ProviderName.Equals(request.ProviderName, StringComparison.OrdinalIgnoreCase))
            ?? throw new DomainException("unsupported_provider", $"OAuth provider '{request.ProviderName}' is not supported.");

        var callbackResult = await provider.HandleCallbackAsync(request.Code, request.State, cancellationToken);

        var externalLogin = await _externalLoginRepository.GetByProviderAndUserIdAsync(request.ProviderName, callbackResult.ProviderUserId);

        User user;
        var isNewUser = false;

        if (externalLogin != null)
        {
            user = await _userRepository.GetByIdAsync(externalLogin.UserId)
                ?? throw new DomainException("user_not_found", "User associated with this OAuth login was not found.");

            externalLogin.RecordUsage();
            if (!string.IsNullOrEmpty(callbackResult.AccessToken))
                externalLogin.StoreTokens(callbackResult.AccessToken, callbackResult.RefreshToken, callbackResult.ExpiresIn);
            await _externalLoginRepository.UpdateAsync(externalLogin);

            user.RecordLogin();
            await _userRepository.UpdateAsync(user);
        }
        else
        {
            var existingUser = await _userRepository.GetByEmailAsync(callbackResult.Email);

            if (existingUser != null)
            {
                throw new LinkingRequiredException(callbackResult.Email, callbackResult.ProviderUserId, callbackResult.AvatarUrl);
            }

            user = await CreateNewUserAsync(request.ProviderName, callbackResult, cancellationToken);
            isNewUser = true;
        }

        var token = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = HashToken(refreshToken);

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

        _logger.LogInformation("[OAuth] User {Email} (Id: {UserId}) login successful. SecurityStamp: {SecurityStamp}. Token generated.", 
            user.Email.Value, user.Id, user.SecurityStamp);
        
        return new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc);
    }

    private async Task<User> CreateNewUserAsync(string providerName, OAuthCallbackResult callbackResult, CancellationToken cancellationToken)
    {
        var randomPassword = BC.HashPassword(Guid.NewGuid().ToString("N"));
        var user = User.Create(callbackResult.Email, randomPassword);

        if (!string.IsNullOrWhiteSpace(callbackResult.Name))
        {
            var parts = callbackResult.Name.Split(' ', 2);
            user.Profile = new UserProfile
            {
                FirstName = parts[0],
                LastName = parts.Length > 1 ? parts[1] : null,
                DisplayName = callbackResult.Name,
                AvatarUrl = callbackResult.AvatarUrl
            };
        }
        else
        {
            user.Profile = new UserProfile
            {
                DisplayName = callbackResult.Email.Split('@')[0],
                AvatarUrl = callbackResult.AvatarUrl
            };
        }

        user.VerifyEmail();
        user.RecordLogin();

        await _userRepository.AddAsync(user);

        var externalLogin = ExternalLogin.Create(user.Id, providerName, callbackResult.ProviderUserId);
        if (!string.IsNullOrEmpty(callbackResult.AccessToken))
            externalLogin.StoreTokens(callbackResult.AccessToken, callbackResult.RefreshToken, callbackResult.ExpiresIn);
        await _externalLoginRepository.AddAsync(externalLogin);

        await CreateDefaultWorkspaceAsync(user, cancellationToken);

        return user;
    }

    private async Task CreateDefaultWorkspaceAsync(User user, CancellationToken cancellationToken)
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

        var zernioName = $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";
        var provisioned = await _zernioClient.ProvisionProfileAsync(
            workspaceId: workspace.Id.ToString(),
            name: zernioName,
            cancellationToken: cancellationToken);

        var profile = ZernioProfile.Create(
            workspaceId: workspace.Id,
            zernioProfileId: provisioned.Id,
            displayName: workspace.Name,
            platform: "zernio");

        await _workspaceRepository.AddAsync(workspace);
        await _zernioProfileRepository.AddAsync(profile);
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

    private static string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
