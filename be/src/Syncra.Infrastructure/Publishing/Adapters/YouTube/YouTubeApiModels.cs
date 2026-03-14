using System.Collections.Generic;

namespace Syncra.Infrastructure.Publishing.Adapters.YouTube;

/// <summary>Request body for POST /upload/youtube/v3/videos (metadata part).</summary>
public class YouTubeVideoInsertRequest
{
    public YouTubeVideoSnippet Snippet { get; set; } = new();
    public YouTubeVideoStatus Status { get; set; } = new();
}

public class YouTubeVideoSnippet
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>CategoryId 22 = "People &amp; Blogs" — safe default.</summary>
    public string CategoryId { get; set; } = "22";
    /// <summary>Tags array — used to tag #Shorts for YouTube Shorts.</summary>
    public List<string> Tags { get; set; } = new();
}

public class YouTubeVideoStatus
{
    /// <summary>"public" | "private" | "unlisted"</summary>
    public string PrivacyStatus { get; set; } = "public";
    public bool SelfDeclaredMadeForKids { get; set; } = false;
}

/// <summary>Response from YouTube after successful upload.</summary>
public class YouTubeVideoInsertResponse
{
    public string? Id { get; set; }
    public string? Kind { get; set; }
    public YouTubeVideoSnippet? Snippet { get; set; }
}

/// <summary>Error response from YouTube API.</summary>
public class YouTubeApiError
{
    public YouTubeApiErrorBody? Error { get; set; }
}

public class YouTubeApiErrorBody
{
    public int Code { get; set; }
    public string? Message { get; set; }
    public List<YouTubeApiErrorDetail> Errors { get; set; } = new();
}

public class YouTubeApiErrorDetail
{
    public string? Reason { get; set; }
    public string? Domain { get; set; }
}

/// <summary>
/// Metadata about a video detected before upload.
/// Used to decide Regular Video vs YouTube Shorts.
/// NOTE: Media entity does not store duration/dimensions yet.
/// IsShort detection is based on SizeBytes heuristic until Media entity is enriched.
/// </summary>
public class YouTubeVideoMetadata
{
    public TimeSpan Duration { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public string ContentType { get; set; } = "video/mp4";
    public long SizeBytes { get; set; }

    /// <summary>
    /// Shorts criteria: duration &lt;= 60s AND aspect ratio is portrait (height &gt; width).
    /// YouTube classifies based on #Shorts tag + video properties.
    /// When Duration/dimensions are unknown (zero), falls back to size heuristic (&lt; 50MB).
    /// </summary>
    public bool IsShort =>
        (Duration > TimeSpan.Zero && Height > 0)
            ? Duration.TotalSeconds <= 60 && Height > Width
            : SizeBytes > 0 && SizeBytes < 50 * 1024 * 1024;
}
