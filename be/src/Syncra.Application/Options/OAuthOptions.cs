namespace Syncra.Application.Options;

public class OAuthOptions
{
    public const string SectionName = "OAuth";
    public OAuthProviderOptions X { get; set; } = new();
    public OAuthProviderOptions TikTok { get; set; } = new();
    public OAuthProviderOptions YouTube { get; set; } = new();
    public OAuthProviderOptions Facebook { get; set; } = new();
}

public class OAuthProviderOptions
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = false;
}
