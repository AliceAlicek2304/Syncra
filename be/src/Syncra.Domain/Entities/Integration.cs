using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;

namespace Syncra.Domain.Entities;

public sealed class Integration : WorkspaceEntityBase
{
    public const int TokenRefreshLastErrorMaxLength = 500;

    // Primitive properties - with private setters
    public string Platform { get; private set; } = string.Empty;
    public string? ExternalAccountId { get; private set; }
    public string? AccessToken { get; private set; }
    public string? RefreshToken { get; private set; }
    public DateTime? ExpiresAtUtc { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string? Metadata { get; private set; }

    // Token refresh tracking
    public DateTime? TokenRefreshLastAttemptAtUtc { get; private set; }
    public DateTime? TokenRefreshLastSuccessAtUtc { get; private set; }
    public string? TokenRefreshLastError { get; private set; }
    public IntegrationRefreshHealthStatus? TokenRefreshHealthStatus { get; private set; }
    public int TokenRefreshConsecutiveFailures { get; private set; }

    // Navigation properties
    public Workspace Workspace { get; set; } = null!;
    public ICollection<Post> Posts { get; set; } = new List<Post>();

    // Private parameterless constructor for EF Core
    private Integration() { }

    // Factory method
    public static Integration Create(
        Guid workspaceId,
        string platform,
        string? externalAccountId = null,
        string? accessToken = null,
        string? refreshToken = null,
        DateTime? expiresAtUtc = null)
    {
        var now = DateTime.UtcNow;

        return new Integration
        {
            WorkspaceId = workspaceId,
            Platform = platform.ToLowerInvariant(),
            ExternalAccountId = externalAccountId,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAtUtc = expiresAtUtc,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors

    public bool IsTokenExpired =>
        ExpiresAtUtc.HasValue && ExpiresAtUtc.Value <= DateTime.UtcNow;

    public bool IsTokenExpiringSoon =>
        ExpiresAtUtc.HasValue && ExpiresAtUtc.Value <= DateTime.UtcNow.AddMinutes(5);

    public bool HasValidToken =>
        !string.IsNullOrWhiteSpace(AccessToken) && !IsTokenExpired;

    public void UpdateTokens(string? accessToken, string? refreshToken, DateTime? expiresAtUtc)
    {
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            AccessToken = accessToken;
        }

        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            RefreshToken = refreshToken;
        }

        if (expiresAtUtc.HasValue)
        {
            ExpiresAtUtc = expiresAtUtc.Value;
        }

        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void ClearTokens()
    {
        AccessToken = null;
        RefreshToken = null;
        ExpiresAtUtc = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void SetMetadata(string? metadata)
    {
        Metadata = string.IsNullOrWhiteSpace(metadata) ? null : metadata;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        if (!IsActive)
        {
            return;
        }

        IsActive = false;
        ClearTokens();
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Reactivate()
    {
        if (IsActive)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(AccessToken))
        {
            throw new DomainException(
                "missing_token",
                "Cannot reactivate integration without a valid access token.");
        }

        IsActive = true;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    // Token refresh health tracking

    public void MarkTokenRefreshAttempt(DateTime utcNow)
    {
        TokenRefreshLastAttemptAtUtc = utcNow;
    }

    public void MarkTokenRefreshSuccess(DateTime utcNow)
    {
        TokenRefreshLastAttemptAtUtc = utcNow;
        TokenRefreshLastSuccessAtUtc = utcNow;
        TokenRefreshLastError = null;
        TokenRefreshHealthStatus = IntegrationRefreshHealthStatus.Ok;
        TokenRefreshConsecutiveFailures = 0;
        UpdatedAtUtc = utcNow;
    }

    public void MarkTokenRefreshFailure(DateTime utcNow, string? error, bool isTerminal = false)
    {
        TokenRefreshLastAttemptAtUtc = utcNow;
        TokenRefreshLastError = TruncateError(error);
        TokenRefreshConsecutiveFailures++;

        if (isTerminal || TokenRefreshConsecutiveFailures >= 3)
        {
            TokenRefreshHealthStatus = IntegrationRefreshHealthStatus.NeedsReauth;
        }
        else if (TokenRefreshConsecutiveFailures == 2)
        {
            TokenRefreshHealthStatus = IntegrationRefreshHealthStatus.Error;
        }
        else
        {
            TokenRefreshHealthStatus = IntegrationRefreshHealthStatus.Warning;
        }

        UpdatedAtUtc = utcNow;
    }

    public bool NeedsTokenRefresh() =>
        IsActive && (IsTokenExpired || IsTokenExpiringSoon || TokenRefreshHealthStatus == IntegrationRefreshHealthStatus.Error);

    public bool IsTokenRefreshHealthy =>
        TokenRefreshHealthStatus == IntegrationRefreshHealthStatus.Ok
        || (TokenRefreshLastSuccessAtUtc.HasValue && TokenRefreshLastSuccessAtUtc > DateTime.UtcNow.AddHours(-24));

    private static string? TruncateError(string? error)
    {
        if (string.IsNullOrWhiteSpace(error))
        {
            return null;
        }

        return error.Length <= TokenRefreshLastErrorMaxLength
            ? error
            : error[..TokenRefreshLastErrorMaxLength];
    }
}
