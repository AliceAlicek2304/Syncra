namespace Syncra.Domain.Exceptions;

/// <summary>
/// Thrown by analytics adapters when the access token is expired/revoked.
/// Matches Potiz's RefreshToken exception used to trigger retry in service layer.
/// </summary>
public class RefreshTokenException : Exception
{
    public RefreshTokenException(string message = "Access token expired, please re-authenticate.") 
        : base(message) { }
}
