namespace Syncra.Domain.Entities;

public sealed class Media : EntityBase
{
    public Guid PostId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }

    public Post Post { get; set; } = null!;
}
