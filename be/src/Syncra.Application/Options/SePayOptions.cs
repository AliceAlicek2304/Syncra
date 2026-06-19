namespace Syncra.Application.Options;

public class SePayOptions
{
    public const string SectionName = "SePay";

    public string AccountNumber { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
}
