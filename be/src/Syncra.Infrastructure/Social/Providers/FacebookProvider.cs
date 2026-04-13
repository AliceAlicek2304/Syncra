using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly.Timeout;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Social.Providers;

public class FacebookProvider : ISocialProvider
{
    private static readonly HttpClient RawOAuthHttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(120)
    };

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
        const string authUrl = "https://www.facebook.com/v25.0/dialog/oauth";

        var scopes = new List<string>
        {
            "pages_manage_posts",
            "pages_read_engagement",
            "read_insights",
            "pages_show_list",
            "public_profile"
        };

        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        var parameters =
            $"client_id={Uri.EscapeDataString(_options.ClientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}" +
            $"&state={Uri.EscapeDataString(state)}" +
            $"&scope={Uri.EscapeDataString(string.Join(",", scopes))}" +
            $"&response_type=code";

        return $"{authUrl}?{parameters}";
    }

    public async Task<AuthResult> ExchangeCodeAsync(string code, string? redirectUri = null, string? state = null, CancellationToken cancellationToken = default)
    {
        var effectiveRedirectUri = redirectUri ?? _options.CallbackUrl;

        try
        {
            var tokenExchangeUrl = "https://graph.facebook.com/v25.0/oauth/access_token" +
                                   $"?client_id={Uri.EscapeDataString(_options.ClientId)}" +
                                   $"&client_secret={Uri.EscapeDataString(_options.ClientSecret)}" +
                                   $"&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}" +
                                   $"&code={Uri.EscapeDataString(code)}";

            var response = await RawOAuthHttpClient.GetAsync(tokenExchangeUrl, CancellationToken.None);
            var responseString = await response.Content.ReadAsStringAsync(CancellationToken.None);

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

            var shortLivedToken = tokenResponse!["access_token"]?.ToString();
            if (string.IsNullOrWhiteSpace(shortLivedToken))
            {
                return new AuthResult
                {
                    IsSuccess = false,
                    Error = new ProviderError
                    {
                        Code = "token_exchange_failed",
                        Message = "Facebook did not return an access token.",
                        Details = responseString
                    }
                };
            }

            var accessToken = shortLivedToken;
            try
            {
                var longLivedUrl = "https://graph.facebook.com/v20.0/oauth/access_token" +
                                   "?grant_type=fb_exchange_token" +
                                   $"&client_id={Uri.EscapeDataString(_options.ClientId)}" +
                                   $"&client_secret={Uri.EscapeDataString(_options.ClientSecret)}" +
                                   $"&fb_exchange_token={Uri.EscapeDataString(shortLivedToken)}";

                var longLivedResponse = await RawOAuthHttpClient.GetAsync(longLivedUrl, CancellationToken.None);
                var longLivedString = await longLivedResponse.Content.ReadAsStringAsync(CancellationToken.None);

                JsonNode? longLivedJson = null;
                try { longLivedJson = JsonSerializer.Deserialize<JsonNode>(longLivedString); } catch { }

                accessToken = longLivedJson?["access_token"]?.ToString() ?? shortLivedToken;
            }
            catch (TimeoutRejectedException)
            {
            }
            catch (Exception)
            {
            }

            var result = new AuthResult
            {
                IsSuccess = true,
                AccessToken = accessToken,
                RefreshToken = accessToken,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(59)
            };

            if (!string.IsNullOrEmpty(accessToken))
            {
                await PopulateUserProfileAsync(result, accessToken, cancellationToken);
                await PopulatePageMetadataAsync(result, accessToken, cancellationToken);
            }

            return result;
        }
        catch (TimeoutRejectedException)
        {
            return new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "provider_timeout",
                    Message = "Facebook phản hồi quá chậm. Vui lòng thử kết nối lại.",
                    IsTransient = true
                }
            };
        }
        catch (TaskCanceledException)
        {
            return new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "provider_timeout",
                    Message = "Facebook phản hồi quá chậm ở bước đổi mã xác thực. Vui lòng thử kết nối lại.",
                    IsTransient = true
                }
            };
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
        var url = "https://graph.facebook.com/v25.0/oauth/access_token" +
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
            var url = $"https://graph.facebook.com/v25.0/me?fields=id,name,email&access_token={Uri.EscapeDataString(accessToken)}";
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
        }
    }

    private async Task PopulatePageMetadataAsync(AuthResult result, string userAccessToken, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category&access_token={Uri.EscapeDataString(userAccessToken)}";
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

            var pages = new List<FacebookPageMetadata>();
            foreach (var item in data)
            {
                var id = item?["id"]?.ToString();
                if (string.IsNullOrWhiteSpace(id))
                {
                    continue;
                }

                pages.Add(new FacebookPageMetadata(
                    id,
                    item?["name"]?.ToString(),
                    item?["access_token"]?.ToString(),
                    item?["category"]?.ToString()));
            }

            if (pages.Count == 0)
            {
                _logger.LogWarning("Facebook /me/accounts returned entries without valid page id.");
                return;
            }

            result.Metadata["pagesJson"] = JsonSerializer.Serialize(pages);
            result.Metadata["pageCount"] = pages.Count.ToString();

            var page = pages[0];
            var pageId = page.Id;
            var pageName = page.Name;
            var pageAccessToken = page.AccessToken;
            var pageCategory = page.Category;

            _logger.LogInformation("Facebook page metadata: pageId={PageId} pageName={PageName} hasPageToken={HasToken}",
                pageId, pageName, !string.IsNullOrEmpty(pageAccessToken));

            if (!string.IsNullOrEmpty(pageId)) result.Metadata["pageId"] = pageId;
            if (!string.IsNullOrEmpty(pageName)) result.Metadata["pageName"] = pageName;
            if (!string.IsNullOrEmpty(pageAccessToken)) result.Metadata["pageAccessToken"] = pageAccessToken;
            if (!string.IsNullOrEmpty(pageCategory)) result.Metadata["pageCategory"] = pageCategory;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Exception fetching Facebook page metadata.");
        }
    }

    private sealed record FacebookPageMetadata(string Id, string? Name, string? AccessToken, string? Category);

    public async Task<bool> RevokeTokenAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        try
        {
            var url = $"https://graph.facebook.com/v25.0/me/permissions?access_token={Uri.EscapeDataString(accessToken)}";
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
