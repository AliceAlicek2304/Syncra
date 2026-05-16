namespace Syncra.Domain.Entities;

public sealed class ExternalLogin : EntityBase
{
    public Guid UserId { get; private set; }
    public string ProviderName { get; private set; } = string.Empty;
    public string ProviderUserId { get; private set; } = string.Empty;
    public DateTime LastUsedAtUtc { get; private set; }
    public string? AccessToken { get; private set; }
    public string? RefreshToken { get; private set; }
    public DateTime? ExpiresAtUtc { get; private set; }

    public User User { get; private set; } = null!;

    private ExternalLogin() { }

    public static ExternalLogin Create(Guid userId, string providerName, string providerUserId)
    {
        var now = DateTime.UtcNow;

        return new ExternalLogin
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProviderName = providerName,
            ProviderUserId = providerUserId,
            CreatedAtUtc = now,
            LastUsedAtUtc = now
        };
    }

    public void RecordUsage()
    {
        LastUsedAtUtc = DateTime.UtcNow;
    }

    public void StoreTokens(string accessToken, string? refreshToken, int expiresInSeconds)
    {
        AccessToken = accessToken;
        if (!string.IsNullOrEmpty(refreshToken))
            RefreshToken = refreshToken;
        ExpiresAtUtc = DateTime.UtcNow.AddSeconds(expiresInSeconds);
    }

    public bool IsTokenExpired() =>
        ExpiresAtUtc == null || ExpiresAtUtc <= DateTime.UtcNow.AddMinutes(5);
}
