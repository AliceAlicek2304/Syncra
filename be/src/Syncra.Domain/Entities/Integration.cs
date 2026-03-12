namespace Syncra.Domain.Entities;

using Syncra.Domain.Enums;

public sealed class Integration : WorkspaceEntityBase
{
    public const int TokenRefreshLastErrorMaxLength = 500;

    public string Platform { get; set; } = string.Empty;
    public string? ExternalAccountId { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Metadata { get; set; }

    public DateTime? TokenRefreshLastAttemptAtUtc { get; private set; }
    public DateTime? TokenRefreshLastSuccessAtUtc { get; private set; }
    public string? TokenRefreshLastError { get; private set; }
    public IntegrationRefreshHealthStatus? TokenRefreshHealthStatus { get; private set; }

    public Workspace Workspace { get; set; } = null!;

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
    }

    public void MarkTokenRefreshFailure(DateTime utcNow, string? error, IntegrationRefreshHealthStatus status = IntegrationRefreshHealthStatus.Error)
    {
        TokenRefreshLastAttemptAtUtc = utcNow;
        TokenRefreshLastError = TruncateError(error);
        TokenRefreshHealthStatus = status;
    }

    private static string? TruncateError(string? error)
    {
        if (string.IsNullOrWhiteSpace(error))
        {
            return null;
        }

        return error.Length <= TokenRefreshLastErrorMaxLength ? error : error[..TokenRefreshLastErrorMaxLength];
    }
}
