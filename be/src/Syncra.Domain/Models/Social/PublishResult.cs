namespace Syncra.Domain.Models.Social;

public class PublishResult
{
    public bool IsSuccess { get; set; }
    public string? ExternalId { get; set; }
    public string? ExternalUrl { get; set; }
    public ProviderError? Error { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();
}

