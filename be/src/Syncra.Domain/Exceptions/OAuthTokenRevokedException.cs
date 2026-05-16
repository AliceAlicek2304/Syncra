namespace Syncra.Domain.Exceptions;

public class OAuthTokenRevokedException : DomainException
{
    public Guid UserId { get; }
    public string ProviderName { get; }

    public OAuthTokenRevokedException(Guid userId, string providerName)
        : base("oauth_token_revoked", $"OAuth token for provider '{providerName}' has been revoked for user {userId}.")
    {
        UserId = userId;
        ProviderName = providerName;
    }
}
