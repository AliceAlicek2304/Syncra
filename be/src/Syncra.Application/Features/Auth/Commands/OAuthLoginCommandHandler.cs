using System.Text.RegularExpressions;
using MediatR;
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
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IJwtOptions _jwtOptions;

    public OAuthLoginCommandHandler(
        IEnumerable<IOAuthProvider> providers,
        IUserRepository userRepository,
        IExternalLoginRepository externalLoginRepository,
        IWorkspaceRepository workspaceRepository,
        IUserSessionRepository userSessionRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IJwtOptions jwtOptions)
    {
        _providers = providers;
        _userRepository = userRepository;
        _externalLoginRepository = externalLoginRepository;
        _workspaceRepository = workspaceRepository;
        _userSessionRepository = userSessionRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
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
        }
        else
        {
            var existingUser = await _userRepository.GetByEmailAsync(callbackResult.Email);

            if (existingUser != null)
            {
                // Collision detected: user exists with this email but not this OAuth provider
                // Throw LinkingRequiredException to trigger password verification on frontend
                throw new LinkingRequiredException(callbackResult.Email, callbackResult.ProviderUserId, callbackResult.AvatarUrl);
            }
            else
            {
                user = await CreateNewUserAsync(request.ProviderName, callbackResult);
                isNewUser = true;
            }
        }

        user.RecordLogin();
        if (!isNewUser)
            await _userRepository.UpdateAsync(user);

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

        return new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc);
    }

    private async Task<User> CreateNewUserAsync(string providerName, OAuthCallbackResult callbackResult)
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

        await _userRepository.AddAsync(user);

        var externalLogin = ExternalLogin.Create(user.Id, providerName, callbackResult.ProviderUserId);
        if (!string.IsNullOrEmpty(callbackResult.AccessToken))
            externalLogin.StoreTokens(callbackResult.AccessToken, callbackResult.RefreshToken, callbackResult.ExpiresIn);
        await _externalLoginRepository.AddAsync(externalLogin);

        await CreateDefaultWorkspaceAsync(user);

        return user;
    }

    private async Task CreateDefaultWorkspaceAsync(User user)
    {
        var emailPrefix = user.Email.Value.Split('@')[0];
        var slug = GenerateSlug(emailPrefix);

        var existing = await _workspaceRepository.GetBySlugAsync(slug);
        if (existing != null)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";
        }

        var workspace = Workspace.Create(user.Id, $"{emailPrefix}'s Workspace", slug);
        workspace.AddMember(user.Id, "owner");

        await _workspaceRepository.AddAsync(workspace);
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
