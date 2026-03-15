namespace Syncra.Application.Common.Interfaces;

/// <summary>
/// Exposes JWT configuration to Application layer handlers without depending on the concrete options class.
/// </summary>
public interface IJwtOptions
{
    string Secret { get; }
    string Issuer { get; }
    string Audience { get; }
    int ExpirationMinutes { get; }
    int RefreshTokenExpirationDays { get; }
}
