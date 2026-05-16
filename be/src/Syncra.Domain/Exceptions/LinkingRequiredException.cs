namespace Syncra.Domain.Exceptions;

public class LinkingRequiredException : DomainException
{
    public string Email { get; }
    public string ProviderKey { get; }

    public LinkingRequiredException(string email, string providerKey) 
        : base("linking_required", $"Account linking required for {email}")
    {
        Email = email;
        ProviderKey = providerKey;
    }
}
