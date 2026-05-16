namespace Syncra.Application.Interfaces;

/// <summary>
/// Provides a valid Google OAuth access token for a user.
/// Handles lazy refresh and revocation detection transparently.
/// </summary>
public interface IGoogleTokenService
{
    /// <summary>
    /// Returns a valid (non-expired) Google access token for the specified user.
    /// Automatically refreshes the token if it is expired or close to expiry.
    /// Throws <see cref="Syncra.Domain.Exceptions.OAuthTokenRevokedException"/> if the user has revoked consent.
    /// </summary>
    Task<string> GetValidAccessTokenAsync(Guid userId, CancellationToken cancellationToken = default);
}
