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
    string GetAuthorizationUrl(string state, string redirectUri);

    /// <summary>
    /// Exchanges an authorization code for an access token.
    /// </summary>
    Task<AuthResult> ExchangeCodeAsync(string code, string redirectUri, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes an existing access token.
    /// </summary>
    Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Publishes content to the underlying social provider using the given access token.
    /// For now this is a minimal contract that can be refined in Phase 03.
    /// </summary>
    Task<PublishResult> PublishAsync(
        string accessToken,
        string content,
        CancellationToken cancellationToken = default);
}
