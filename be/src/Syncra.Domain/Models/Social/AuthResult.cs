namespace Syncra.Domain.Models.Social;

public class AuthResult
{
    public bool IsSuccess { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public string? ExternalUserId { get; set; }
    public string? ExternalUsername { get; set; }
    public ProviderError? Error { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();
}
