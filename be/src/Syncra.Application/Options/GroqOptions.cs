namespace Syncra.Application.Options;

public sealed class GroqOptions
{
    public const string SectionName = "Groq";

    public string BaseUrl { get; set; } = "https://api.groq.com";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "llama-3.3-70b-versatile";
    public string[] FallbackModels { get; set; } = [];
    public double Temperature { get; set; } = 0.8;
    public int MaxCompletionTokens { get; set; } = 1200;
}
