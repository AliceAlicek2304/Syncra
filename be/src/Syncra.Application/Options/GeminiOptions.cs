namespace Syncra.Application.Options;

public class GeminiOptions
{
    public const string SectionName = "Gemini";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-1.5-flash";
    public double Temperature { get; set; } = 0.7;
    public int MaxOutputTokens { get; set; } = 8192;
}
