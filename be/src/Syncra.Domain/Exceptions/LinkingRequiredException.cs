namespace Syncra.Domain.Exceptions;

public class LinkingRequiredException : DomainException
{
    public string Email { get; }
    public string ProviderKey { get; }
    public string? AvatarUrl { get; }

    public LinkingRequiredException(string email, string providerKey, string? avatarUrl = null) 
        : base("linking_required", $"Account linking required for {email}")
    {
        Email = email;
        ProviderKey = providerKey;
        AvatarUrl = avatarUrl;
    }
}
