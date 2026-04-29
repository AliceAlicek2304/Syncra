namespace Syncra.Application.Options;

public sealed class PaymentOptions
{
    public const string SectionName = "Payments";

    public string DefaultProvider { get; set; } = "stripe";
}
