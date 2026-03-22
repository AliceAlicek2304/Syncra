using System.Threading;
using System.Threading.Tasks;
using Syncra.Domain.Models.Social;

namespace Syncra.Domain.Interfaces;

public interface ISocialProvider
{
    string ProviderId { get; }
    
    /// <summary>
    /// Gets the authorization URL for the user to authenticate and authorize the application.
    /// </summary>
    string GetAuthorizationUrl(string state, string? redirectUri = null);

    /// <summary>
    /// Exchanges an authorization code for an access token.
    /// </summary>
    Task<AuthResult> ExchangeCodeAsync(string code, string? redirectUri = null, string? state = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes an existing access token.
    /// </summary>
    Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Revoke the access token with the provider. Optional - not all providers support this.
    /// Default implementation returns false (no-op).
    /// </summary>
    Task<bool> RevokeTokenAsync(string accessToken, CancellationToken cancellationToken = default)
        => Task.FromResult(false);
}
