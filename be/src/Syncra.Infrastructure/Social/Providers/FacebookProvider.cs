using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Social.Providers;

public class FacebookProvider : ISocialProvider
{
    private readonly HttpClient _httpClient;
    private readonly OAuthProviderOptions _options;
    private readonly ILogger<FacebookProvider> _logger;

    public FacebookProvider(HttpClient httpClient, IOptions<OAuthOptions> options, ILogger<FacebookProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value.Facebook;
        _logger = logger;
    }

    public string ProviderId => "facebook";

    public string GetAuthorizationUrl(string state, string? redirectUri = null)
    {
        const string authUrl = "https://www.facebook.com/v18.0/dialog/oauth";

        var scopes = string.Join(",", new[]
        {
            "pages_manage_posts",
            "pages_read_engagement",
            "read_insights",
            "pages_show_list",
            "public_profile"
        });

        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        var parameters =
            $"client_id={Uri.EscapeDataString(_options.ClientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}" +
            $"&state={Uri.EscapeDataString(state)}" +
            $"&scope={Uri.EscapeDataString(scopes)}" +
            $"&response_type=code";

        return $"{authUrl}?{parameters}";
    }

    public async Task<AuthResult> ExchangeCodeAsync(string code, string? redirectUri = null, CancellationToken cancellationToken = default)
    {
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        var requestData = new Dictionary<string, string>
        {
            { "client_id", _options.ClientId },
            { "client_secret", _options.ClientSecret },
            { "redirect_uri", effectiveRedirectUri },
            { "code", code },
            { "grant_type", "authorization_code" }
        };

        try
        {
            var content = new FormUrlEncodedContent(requestData);
            var response = await _httpClient.PostAsync("https://graph.facebook.com/v18.0/oauth/access_token", content, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            JsonNode? tokenResponse = null;
            try { tokenResponse = JsonSerializer.Deserialize<JsonNode>(responseString); } catch { }

            var error = tokenResponse?["error"]?["message"]?.ToString() ?? tokenResponse?["error"]?.ToString();
            if (!string.IsNullOrEmpty(error) || !response.IsSuccessStatusCode)
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = tokenResponse?["error"]?["code"]?.ToString() ?? "token_exchange_failed",
                        Message = error ?? "Failed to exchange code with Facebook.",
                        Details = responseString
                    }
                };
            }

            var accessToken = tokenResponse!["access_token"]?.ToString();

            var result = new AuthResult
            {
                IsSuccess = true,
                AccessToken = accessToken,
                // Facebook user tokens don't have refresh tokens; use access token for fb_exchange_token flow
                RefreshToken = accessToken,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(60)
            };

            if (!string.IsNullOrEmpty(accessToken))
            {
                await PopulateUserProfileAsync(result, accessToken, cancellationToken);
                await PopulatePageMetadataAsync(result, accessToken, cancellationToken);
            }

            return result;
        }
        catch (Exception ex)
        {
            return new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "internal_error", Message = ex.Message }
            };
        }
    }

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        // Facebook uses fb_exchange_token to get a new long-lived token
        var url = "https://graph.facebook.com/v18.0/oauth/access_token" +
                  $"?grant_type=fb_exchange_token" +
                  $"&client_id={Uri.EscapeDataString(_options.ClientId)}" +
                  $"&client_secret={Uri.EscapeDataString(_options.ClientSecret)}" +
                  $"&fb_exchange_token={Uri.EscapeDataString(refreshToken)}";

        try
        {
            var response = await _httpClient.GetAsync(url, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            JsonNode? tokenResponse = null;
            try { tokenResponse = JsonSerializer.Deserialize<JsonNode>(responseString); } catch { }

            if (!response.IsSuccessStatusCode || tokenResponse?["access_token"] == null)
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "token_refresh_failed",
                        Message = tokenResponse?["error"]?["message"]?.ToString() ?? "Failed to refresh Facebook token.",
                        Details = responseString
                    }
                };
            }

            var newAccessToken = tokenResponse["access_token"]!.ToString();
            return new AuthResult
            {
                IsSuccess = true,
                AccessToken = newAccessToken,
                RefreshToken = newAccessToken,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(60)
            };
        }
        catch (Exception ex)
        {
            return new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "token_refresh_failed", Message = ex.Message }
            };
        }
    }

    private async Task PopulateUserProfileAsync(AuthResult result, string accessToken, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token={Uri.EscapeDataString(accessToken)}";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode) return;

            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
            var profile = JsonSerializer.Deserialize<JsonNode>(responseString);
            if (profile == null) return;

            result.ExternalUserId = profile["id"]?.ToString();

            var email = profile["email"]?.ToString();
            var name = profile["name"]?.ToString();

            result.ExternalUsername = !string.IsNullOrEmpty(email) ? email : name;

            if (!string.IsNullOrEmpty(name)) result.Metadata["name"] = name;
            if (!string.IsNullOrEmpty(email)) result.Metadata["email"] = email;
        }
        catch
        {
            // Profile enrichment — never block auth flow
        }
    }

    private async Task PopulatePageMetadataAsync(AuthResult result, string userAccessToken, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://graph.facebook.com/v18.0/me/accounts?access_token={Uri.EscapeDataString(userAccessToken)}";
            var response = await _httpClient.GetAsync(url, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Facebook /me/accounts returned {StatusCode}: {Body}", (int)response.StatusCode, responseString);
                return;
            }

            var accountsResponse = JsonSerializer.Deserialize<JsonNode>(responseString);
            var data = accountsResponse?["data"]?.AsArray();

            if (data == null || data.Count == 0)
            {
                _logger.LogWarning("Facebook /me/accounts returned empty data — user may not have any Pages.");
                return;
            }

            var page = data[0];
            var pageId = page?["id"]?.ToString();
            var pageName = page?["name"]?.ToString();
            var pageAccessToken = page?["access_token"]?.ToString();
            var pageCategory = page?["category"]?.ToString();

            if (!string.IsNullOrEmpty(pageId)) result.Metadata["pageId"] = pageId;
            if (!string.IsNullOrEmpty(pageName)) result.Metadata["pageName"] = pageName;
            if (!string.IsNullOrEmpty(pageAccessToken)) result.Metadata["pageAccessToken"] = pageAccessToken;
            if (!string.IsNullOrEmpty(pageCategory)) result.Metadata["pageCategory"] = pageCategory;
        }
        catch (Exception ex)
        {
            // Page metadata is enrichment — never block auth flow
            _logger.LogWarning(ex, "Exception fetching Facebook page metadata.");
        }
    }

    public async Task<bool> RevokeTokenAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        try
        {
            var url = $"https://graph.facebook.com/v18.0/me/permissions?access_token={Uri.EscapeDataString(accessToken)}";
            var response = await _httpClient.DeleteAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Facebook token revoke returned {StatusCode}", (int)response.StatusCode);
                return false;
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var responseJson = JsonSerializer.Deserialize<JsonNode>(body);
            return responseJson?["success"]?.ToString() == "true";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Exception revoking Facebook token.");
            return false;
        }
    }
}
