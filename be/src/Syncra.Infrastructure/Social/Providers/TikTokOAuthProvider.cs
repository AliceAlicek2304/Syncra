using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Social.Providers;

public class TikTokOAuthProvider : ISocialProvider
{
    private readonly HttpClient _httpClient;
    private readonly OAuthProviderOptions _options;

    public TikTokOAuthProvider(HttpClient httpClient, IOptions<OAuthOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value.TikTok;
    }

    public string ProviderId => "tiktok";

    public string GetAuthorizationUrl(string state, string? redirectUri = null)
    {
        var authUrl = "https://www.tiktok.com/v2/auth/authorize/";
        // video.upload and video.publish are required for the Content Posting API v2
        var scopes = "user.info.basic,video.list,video.upload,video.publish";
        
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;
        
        return $"{authUrl}?client_key={_options.ClientId}&response_type=code&scope={Uri.EscapeDataString(scopes)}&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}&state={Uri.EscapeDataString(state)}";
    }

    public async Task<AuthResult> ExchangeCodeAsync(string code, string? redirectUri = null, string? state = null, CancellationToken cancellationToken = default)
    {
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        return await GetTokensAsync(
            new Dictionary<string, string>
            {
                { "grant_type", "authorization_code" },
                { "code", code },
                { "redirect_uri", effectiveRedirectUri },
                { "client_key", _options.ClientId },
                { "client_secret", _options.ClientSecret }
            }, cancellationToken);
    }

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        return await GetTokensAsync(
            new Dictionary<string, string>
            {
                { "grant_type", "refresh_token" },
                { "refresh_token", refreshToken },
                { "client_key", _options.ClientId },
                { "client_secret", _options.ClientSecret }
            }, cancellationToken);
    }

    private async Task<AuthResult> GetTokensAsync(Dictionary<string, string> requestData, CancellationToken cancellationToken)
    {
        try
        {
            var content = new FormUrlEncodedContent(requestData);
            
            var request = new HttpRequestMessage(HttpMethod.Post, "https://open.tiktokapis.com/v2/oauth/token/")
            {
                Content = content
            };

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            var tokenResponse = JsonSerializer.Deserialize<JsonNode>(responseString);
            if (tokenResponse == null)
                throw new Exception("Invalid JSON response.");

            // TikTok might return error in body even with 200 OK
            if (tokenResponse["error"]?.ToString() is string error && !string.IsNullOrEmpty(error))
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = tokenResponse["error"]?.ToString() ?? "token_error",
                        Message = tokenResponse["error_description"]?.ToString() ?? "Unknown error",
                        Details = responseString
                    }
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "token_exchange_failed",
                        Message = "Failed to exchange code/refresh token with TikTok.",
                        Details = responseString
                    }
                };
            }

            var accessToken = tokenResponse["access_token"]?.ToString();
            var refreshToken = tokenResponse["refresh_token"]?.ToString();
            var expiresIn = tokenResponse["expires_in"]?.GetValue<int>() ?? 0;
            var openId = tokenResponse["open_id"]?.ToString();

            var result = new AuthResult
            {
                IsSuccess = true,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresIn > 0 ? DateTimeOffset.UtcNow.AddSeconds(expiresIn) : null,
                ExternalUserId = openId
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
            var request = new HttpRequestMessage(HttpMethod.Get, "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
                var profile = JsonSerializer.Deserialize<JsonNode>(responseString);
                
                var data = profile?["data"]?["user"];
                if (data != null)
                {
                    result.ExternalUsername = data["display_name"]?.ToString();
                    
                    var avatarUrl = data["avatar_url"]?.ToString();
                    if (!string.IsNullOrEmpty(avatarUrl))
                    {
                        result.Metadata["avatar_url"] = avatarUrl;
                    }
                }
            }
        }
        catch
        {
            // Ignore profile fetching errors
        }
    }

}
