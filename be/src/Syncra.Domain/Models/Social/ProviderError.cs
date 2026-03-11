namespace Syncra.Domain.Models.Social;

public class ProviderError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
}
