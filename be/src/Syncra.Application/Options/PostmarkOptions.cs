namespace Syncra.Application.Options;

public class PostmarkOptions
{
    public const string SectionName = "Postmark";

    public string ApiKey { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Syncra Support";
}
