
namespace Syncra.Application.Options;

public class StorageOptions
{
    public const string SectionName = "Storage";

    public string LocalRootPath { get; set; } = string.Empty;
    public string PublicBaseUrl { get; set; } = string.Empty;
}
