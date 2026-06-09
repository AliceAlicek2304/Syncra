namespace Syncra.Application.Options;

public class ZernioOptions
{
    public const string SectionName = "Zernio";
    public string ApiKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string WebhookUrl { get; set; } = string.Empty;
}
