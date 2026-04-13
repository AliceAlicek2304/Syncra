namespace Syncra.Domain.Models.Social;

public class ProviderError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
    public bool IsTransient { get; set; }

    public override string ToString()
    {
        if (!string.IsNullOrWhiteSpace(Code) && !string.IsNullOrWhiteSpace(Message))
        {
            return $"{Code}: {Message}";
        }

        if (!string.IsNullOrWhiteSpace(Message))
        {
            return Message;
        }

        return Code;
    }
}
