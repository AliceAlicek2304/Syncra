using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Services;

public sealed class GoogleTokenService : IGoogleTokenService
{
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string ProviderName = "google";

    private readonly IDistributedCache _cache;
    private readonly IExternalLoginRepository _externalLoginRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GoogleOAuthOptions _googleOptions;
    private readonly IDataProtector _protector;
    private readonly ILogger<GoogleTokenService> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GoogleTokenService(
        IDistributedCache cache,
        IExternalLoginRepository externalLoginRepository,
        IUnitOfWork unitOfWork,
        IHttpClientFactory httpClientFactory,
        IOptions<GoogleOAuthOptions> googleOptions,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<GoogleTokenService> logger)
    {
        _cache = cache;
        _externalLoginRepository = externalLoginRepository;
        _unitOfWork = unitOfWork;
        _httpClientFactory = httpClientFactory;
        _googleOptions = googleOptions.Value;
        _protector = dataProtectionProvider.CreateProtector("ExternalLogin.Tokens");
        _logger = logger;
    }

    public async Task<string> GetValidAccessTokenAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildCacheKey(userId);

        // 1. Check Redis cache first
        var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
        if (cached != null)
        {
            var cachedToken = JsonSerializer.Deserialize<CachedOAuthToken>(cached, _jsonOptions);
            if (cachedToken != null && cachedToken.ExpiresAtUtc > DateTime.UtcNow.AddMinutes(5))
            {
                return cachedToken.AccessToken;
            }
        }

        // 2. Load from database
        var logins = await _externalLoginRepository.GetByUserIdAsync(userId);
        var externalLogin = logins.FirstOrDefault(l =>
            l.ProviderName.Equals(ProviderName, StringComparison.OrdinalIgnoreCase));

        if (externalLogin == null || string.IsNullOrEmpty(externalLogin.AccessToken))
        {
            throw new DomainException("no_google_token",
                $"No Google OAuth token found for user {userId}. User must re-authenticate with Google.");
        }

        // 3. Decrypt tokens for use
        var rawAccessToken = _protector.Unprotect(externalLogin.AccessToken);

        if (!externalLogin.IsTokenExpired())
        {
            // Token still valid — populate Redis and return
            await WriteToCache(cacheKey, rawAccessToken, externalLogin.RefreshToken != null
                ? _protector.Unprotect(externalLogin.RefreshToken)
                : null, externalLogin.ExpiresAtUtc!.Value, cancellationToken);
            return rawAccessToken;
        }

        // 4. Token expired — refresh
        if (string.IsNullOrEmpty(externalLogin.RefreshToken))
        {
            throw new OAuthTokenRevokedException(userId, ProviderName);
        }

        var rawRefreshToken = _protector.Unprotect(externalLogin.RefreshToken);
        return await RefreshAndStoreAsync(externalLogin, userId, rawRefreshToken, cancellationToken);
    }

    private async Task<string> RefreshAndStoreAsync(
        Domain.Entities.ExternalLogin externalLogin,
        Guid userId,
        string rawRefreshToken,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Refreshing Google OAuth token for user {UserId}", userId);

        var httpClient = _httpClientFactory.CreateClient("GoogleOAuth");

        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("client_id", _googleOptions.ClientId),
            new KeyValuePair<string, string>("client_secret", _googleOptions.ClientSecret),
            new KeyValuePair<string, string>("refresh_token", rawRefreshToken),
            new KeyValuePair<string, string>("grant_type", "refresh_token")
        });

        var response = await httpClient.PostAsync(TokenEndpoint, content, cancellationToken);

        // Check for revocation (Google returns 400 with error: invalid_grant)
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (errorBody.Contains("invalid_grant", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Google token revoked for user {UserId}", userId);
                throw new OAuthTokenRevokedException(userId, ProviderName);
            }

            throw new InvalidOperationException($"Google token refresh failed with status {response.StatusCode}: {errorBody}");
        }

        var tokenResponse = await response.Content.ReadFromJsonAsync<RefreshTokenResponse>(
            cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Failed to deserialize Google token refresh response");

        // Encrypt and store new tokens
        var encryptedAccessToken = _protector.Protect(tokenResponse.AccessToken);
        externalLogin.StoreTokens(encryptedAccessToken, null, tokenResponse.ExpiresIn);
        await _externalLoginRepository.UpdateAsync(externalLogin);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Write-through to Redis
        var cacheKey = BuildCacheKey(userId);
        await WriteToCache(cacheKey, tokenResponse.AccessToken, rawRefreshToken,
            externalLogin.ExpiresAtUtc!.Value, cancellationToken);

        _logger.LogInformation("Google OAuth token refreshed successfully for user {UserId}", userId);
        return tokenResponse.AccessToken;
    }

    private async Task WriteToCache(
        string cacheKey,
        string rawAccessToken,
        string? rawRefreshToken,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken)
    {
        var ttl = expiresAtUtc - DateTime.UtcNow - TimeSpan.FromMinutes(5);
        if (ttl <= TimeSpan.Zero) return;

        var cachedToken = new CachedOAuthToken(rawAccessToken, rawRefreshToken ?? string.Empty, expiresAtUtc);
        var json = JsonSerializer.Serialize(cachedToken, _jsonOptions);

        await _cache.SetStringAsync(cacheKey, json, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl
        }, cancellationToken);
    }

    private static string BuildCacheKey(Guid userId) => $"oauth:tokens:{userId}:google";

    private record CachedOAuthToken(
        string AccessToken,
        string RefreshToken,
        DateTime ExpiresAtUtc);

    private record RefreshTokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("token_type")] string TokenType);
}
