using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Social.Providers;

public class YouTubeProvider : ISocialProvider
{
    private readonly HttpClient _httpClient;
    private readonly OAuthProviderOptions _options;

    public YouTubeProvider(HttpClient httpClient, IOptions<OAuthOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value.YouTube;
    }

    public string ProviderId => "youtube";

    public string GetAuthorizationUrl(string state, string? redirectUri = null)
    {
        const string authUrl = "https://accounts.google.com/o/oauth2/v2/auth";

        // Request upload + analytics + read access plus basic profile information.
        var scopes = string.Join(" ", new[]
        {
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid"
        });

        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        var parameters =
            $"response_type=code" +
            $"&client_id={Uri.EscapeDataString(_options.ClientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}" +
            $"&scope={Uri.EscapeDataString(scopes)}" +
            $"&state={Uri.EscapeDataString(state)}" +
            $"&access_type=offline" +
            $"&prompt=consent";

        return $"{authUrl}?{parameters}";
    }

    public async Task<AuthResult> ExchangeCodeAsync(string code, string? redirectUri = null, CancellationToken cancellationToken = default)
    {
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        var requestData = new Dictionary<string, string>
        {
            { "grant_type", "authorization_code" },
            { "code", code },
            { "redirect_uri", effectiveRedirectUri },
            { "client_id", _options.ClientId },
            { "client_secret", _options.ClientSecret }
        };

        return await GetTokensAsync(requestData, cancellationToken);
    }

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var requestData = new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "refresh_token", refreshToken },
            { "client_id", _options.ClientId },
            { "client_secret", _options.ClientSecret }
        };

        return await GetTokensAsync(requestData, cancellationToken);
    }

    private async Task<AuthResult> GetTokensAsync(Dictionary<string, string> requestData, CancellationToken cancellationToken)
    {
        try
        {
            var content = new FormUrlEncodedContent(requestData);

            var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
            {
                Content = content
            };

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            JsonNode? tokenResponse = null;
            try
            {
                tokenResponse = JsonSerializer.Deserialize<JsonNode>(responseString);
            }
            catch
            {
                // If we cannot parse JSON, treat it as an error response.
            }

            // Google may return an error object in the body
            var error = tokenResponse?["error"]?.ToString();
            if (!string.IsNullOrEmpty(error))
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = error,
                        Message = tokenResponse?["error_description"]?.ToString() ?? "Failed to exchange token with Google.",
                        Details = responseString
                    }
                };
            }

            if (!response.IsSuccessStatusCode || tokenResponse == null)
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "token_exchange_failed",
                        Message = "Failed to exchange code/refresh token with Google.",
                        Details = responseString
                    }
                };
            }

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
            var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return;
            }

            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
            var profile = JsonSerializer.Deserialize<JsonNode>(responseString);
            if (profile == null)
            {
                return;
            }

            result.ExternalUserId = profile["sub"]?.ToString();

            var email = profile["email"]?.ToString();
            var name = profile["name"]?.ToString();
            var picture = profile["picture"]?.ToString();

            // Prefer email as the external username if available, otherwise fall back to name.
            result.ExternalUsername = !string.IsNullOrEmpty(email) ? email : name;

            if (!string.IsNullOrEmpty(name))
            {
                result.Metadata["name"] = name;
            }

            if (!string.IsNullOrEmpty(email))
            {
                result.Metadata["email"] = email;
            }

            if (!string.IsNullOrEmpty(picture))
            {
                result.Metadata["picture"] = picture;
            }

            // Enrich with YouTube channel metadata (channelId, title, thumbnail, subscriberCount).
            await PopulateChannelMetadataAsync(result, accessToken, cancellationToken);
        }
        catch
        {
            // Ignore profile fetching errors, token exchange already succeeded.
        }
    }

    private async Task PopulateChannelMetadataAsync(AuthResult result, string accessToken, CancellationToken cancellationToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get,
                "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                // Log warning but don't fail — channel info is enrichment only.
                return;
            }

            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
            var channelResponse = JsonSerializer.Deserialize<JsonNode>(responseString);
            var items = channelResponse?["items"]?.AsArray();
            if (items == null || items.Count == 0)
            {
                return;
            }

            var channel = items[0];
            var channelId = channel?["id"]?.ToString();
            var channelTitle = channel?["snippet"]?["title"]?.ToString();
            var channelThumbnail = channel?["snippet"]?["thumbnails"]?["default"]?["url"]?.ToString();
            var subscriberCount = channel?["statistics"]?["subscriberCount"]?.ToString();

            if (!string.IsNullOrEmpty(channelId))
                result.Metadata["channelId"] = channelId;

            if (!string.IsNullOrEmpty(channelTitle))
                result.Metadata["channelTitle"] = channelTitle;

            if (!string.IsNullOrEmpty(channelThumbnail))
                result.Metadata["channelThumbnail"] = channelThumbnail;

            if (!string.IsNullOrEmpty(subscriberCount))
                result.Metadata["subscriberCount"] = subscriberCount;
        }
        catch
        {
            // Channel metadata is enrichment — never block the auth flow.
        }
    }

}

