namespace Syncra.Domain.Interfaces;

public interface IOAuthProvider
{
    string ProviderName { get; }

    string GetLoginUrl(string returnUrl);

    Task<OAuthCallbackResult> HandleCallbackAsync(string code, string state, CancellationToken cancellationToken = default);
}

public record OAuthCallbackResult(
    string ProviderUserId,
    string Email,
    string? Name,
    string? AvatarUrl,
    bool IsNewUser,
    Guid? ExistingUserId
);
