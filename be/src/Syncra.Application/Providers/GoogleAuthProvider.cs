using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Web;
using Microsoft.Extensions.Options;
using Syncra.Domain.Interfaces;
using Syncra.Application.Options;

namespace Syncra.Application.Providers;

public class GoogleAuthProvider : IOAuthProvider
{
    private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string UserInfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";

    private readonly GoogleOAuthOptions _options;
    private readonly HttpClient _httpClient;
    private readonly string _callbackUrl;

    public GoogleAuthProvider(IOptions<GoogleOAuthOptions> options, HttpClient httpClient)
    {
        _options = options.Value;
        _httpClient = httpClient;
        _callbackUrl = $"{options.Value.CallbackUrl.TrimEnd('/')}/auth/google/callback";
    }

    public string ProviderName => "google";

    public string GetLoginUrl(string returnUrl)
    {
        var state = GenerateState(returnUrl);

        var parameters = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _callbackUrl,
            ["response_type"] = "code",
            ["scope"] = string.Join(" ", _options.Scopes),
            ["state"] = state,
            ["access_type"] = "offline",
            ["prompt"] = "consent"
        };

        var queryString = string.Join("&", parameters.Select(kv => $"{kv.Key}={HttpUtility.UrlEncode(kv.Value)}"));
        return $"{AuthorizationEndpoint}?{queryString}";
    }

    public async Task<OAuthCallbackResult> HandleCallbackAsync(string code, string state, CancellationToken cancellationToken = default)
    {
        var tokens = await ExchangeCodeForTokensAsync(code, cancellationToken);

        var userInfo = await GetUserInfoAsync(tokens.AccessToken, cancellationToken);

        return new OAuthCallbackResult(
            ProviderUserId: userInfo.Sub,
            Email: userInfo.Email,
            Name: userInfo.Name,
            AvatarUrl: userInfo.Picture,
            IsNewUser: true,
            ExistingUserId: null,
            AccessToken: tokens.AccessToken,
            RefreshToken: tokens.RefreshToken,
            ExpiresIn: tokens.ExpiresIn
        );
    }

    private async Task<TokenResponse> ExchangeCodeForTokensAsync(string code, CancellationToken cancellationToken)
    {
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("client_id", _options.ClientId),
            new KeyValuePair<string, string>("client_secret", _options.ClientSecret),
            new KeyValuePair<string, string>("redirect_uri", _callbackUrl),
            new KeyValuePair<string, string>("grant_type", "authorization_code")
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var tokens = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Failed to deserialize token response");

        return tokens;
    }

    private async Task<UserInfoResponse> GetUserInfoAsync(string accessToken, CancellationToken cancellationToken)
    {
        _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.GetAsync(UserInfoEndpoint, cancellationToken);
        response.EnsureSuccessStatusCode();

        var userInfo = await response.Content.ReadFromJsonAsync<UserInfoResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Failed to deserialize user info response");

        return userInfo;
    }

    private static string GenerateState(string returnUrl)
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var state = Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");

        return $"{state}:{Convert.ToBase64String(Encoding.UTF8.GetBytes(returnUrl)).Replace("+", "-").Replace("/", "_").Replace("=", "")}";
    }

    private record TokenResponse(
        string AccessToken,
        string RefreshToken,
        int ExpiresIn,
        string IdToken
    );

    private record UserInfoResponse(
        string Sub,
        string Email,
        bool EmailVerified,
        string? Name,
        string? Picture
    );
}
