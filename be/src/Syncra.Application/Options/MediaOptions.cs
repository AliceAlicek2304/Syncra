
using System.Collections.Generic;

namespace Syncra.Application.Options;

public class MediaOptions
{
    public const string SectionName = "Media";

    public long MaxFileSize { get; set; } = 5 * 1024 * 1024; // 5MB
    public List<string> AllowedMimeTypes { get; set; } = new() { "image/jpeg", "image/png", "image/gif" };
}
