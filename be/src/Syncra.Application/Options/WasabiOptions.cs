
namespace Syncra.Application.Options;

public class WasabiOptions
{
    public const string SectionName = "Wasabi";

    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    /// <summary>
    /// Wasabi S3-compatible endpoint, e.g. "https://s3.us-east-1.wasabisys.com"
    /// </summary>
    public string ServiceUrl { get; set; } = "https://s3.us-east-1.wasabisys.com";
    public string BucketName { get; set; } = string.Empty;
}
