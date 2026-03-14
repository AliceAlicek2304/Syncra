using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Social.Providers;

public class XOAuthProvider : ISocialProvider
{
    private readonly HttpClient _httpClient;
    private readonly OAuthProviderOptions _options;
    
    // Twitter requires PKCE. For a stateless implementation without storing challenge per request,
    // we use a static plain verifier. In a real production system, this should be stored per state.
    private const string CodeVerifier = "syncra_challenge_verifier_for_twitter_oauth2_auth";

    public XOAuthProvider(HttpClient httpClient, IOptions<OAuthOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value.X;
    }

    public string ProviderId => "x";

    public string GetAuthorizationUrl(string state, string? redirectUri = null)
    {
        var authUrl = "https://twitter.com/i/oauth2/authorize";
        var scopes = "tweet.read tweet.write users.read offline.access";
        
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;
        
        return $"{authUrl}?response_type=code&client_id={_options.ClientId}&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}&scope={Uri.EscapeDataString(scopes)}&state={Uri.EscapeDataString(state)}&code_challenge={CodeVerifier}&code_challenge_method=plain";
    }

    public async Task<AuthResult> ExchangeCodeAsync(string code, string? redirectUri = null, CancellationToken cancellationToken = default)
    {
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;
        
        return await GetTokensAsync(
            new Dictionary<string, string>
            {
                { "grant_type", "authorization_code" },
                { "code", code },
                { "redirect_uri", effectiveRedirectUri },
                { "client_id", _options.ClientId },
                { "code_verifier", CodeVerifier }
            }, cancellationToken);
    }

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        return await GetTokensAsync(
            new Dictionary<string, string>
            {
                { "grant_type", "refresh_token" },
                { "refresh_token", refreshToken },
                { "client_id", _options.ClientId }
            }, cancellationToken);
    }

    private async Task<AuthResult> GetTokensAsync(Dictionary<string, string> requestData, CancellationToken cancellationToken)
    {
        try
        {
            var content = new FormUrlEncodedContent(requestData);
            
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.twitter.com/2/oauth2/token")
            {
                Content = content
            };

            // Twitter requires Basic Auth for Confidential Clients
            var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authString);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "token_exchange_failed",
                        Message = "Failed to exchange code/refresh token with X.",
                        Details = responseString
                    }
                };
            }

            var tokenResponse = JsonSerializer.Deserialize<JsonNode>(responseString);
            if (tokenResponse == null)
                throw new Exception("Invalid JSON response.");

            var accessToken = tokenResponse["access_token"]?.ToString();
            var refreshToken = tokenResponse["refresh_token"]?.ToString();
            var expiresIn = tokenResponse["expires_in"]?.GetValue<int>() ?? 0;

            var result = new AuthResult
            {
                IsSuccess = true,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresIn > 0 ? DateTimeOffset.UtcNow.AddSeconds(expiresIn) : null
            };

            if (!string.IsNullOrEmpty(accessToken))
            {
                await PopulateUserProfileAsync(result, accessToken, cancellationToken);
            }

            return result;
        }
        catch (Exception ex)
        {
            return new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "internal_error",
                    Message = ex.Message
                }
            };
        }
    }

    private async Task PopulateUserProfileAsync(AuthResult result, string accessToken, CancellationToken cancellationToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "https://api.twitter.com/2/users/me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
                var profile = JsonSerializer.Deserialize<JsonNode>(responseString);
                
                var data = profile?["data"];
                if (data != null)
                {
                    result.ExternalUserId = data["id"]?.ToString();
                    result.ExternalUsername = data["username"]?.ToString();
                    
                    var name = data["name"]?.ToString();
                    if (!string.IsNullOrEmpty(name))
                    {
                        result.Metadata["name"] = name;
                    }
                }
            }
        }
        catch
        {
            // Ignore profile fetching errors as it shouldn't fail the token exchange completely,
            // or maybe it should? We'll just leave it.
        }
    }

}
