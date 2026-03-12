
namespace Syncra.Infrastructure.Publishing;

public class PublishError
{
    public string? Code { get; set; }
    public string? Message { get; set; }
    public string? ProviderResponse { get; set; }
    public bool IsTransient { get; set; }
}
