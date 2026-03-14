namespace Syncra.Infrastructure.Publishing.Adapters.Facebook;

// POST /{page-id}/feed — text post or link post
public class FacebookFeedPostRequest
{
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
}

// POST /{page-id}/photos — photo post
public class FacebookPhotoPostRequest
{
    public string Caption { get; set; } = string.Empty;
    public string? Url { get; set; }
    public bool Published { get; set; } = true;
}

// POST /{page-id}/videos — video post
public class FacebookVideoPostRequest
{
    public string Description { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool Published { get; set; } = true;
}

// Response from Graph API after creating post/photo/video
public class FacebookPostResponse
{
    public string? Id { get; set; }
    public string? VideoId { get; set; }
    public string? PostId { get; set; }
}

// Error response from Graph API
public class FacebookApiError
{
    public FacebookApiErrorBody? Error { get; set; }
}

public class FacebookApiErrorBody
{
    public int Code { get; set; }
    public int? Subcode { get; set; }
    public string? Message { get; set; }
    public string? Type { get; set; }
    public string? FbtraceId { get; set; }
}

/// <summary>
/// Content type detected from PublishRequest.MediaIds.
/// Determines which Graph API endpoint is called.
/// </summary>
public enum FacebookContentType
{
    TextOnly,   // POST /{page-id}/feed
    Photo,      // POST /{page-id}/photos (multipart)
    Video       // POST /{page-id}/videos (multipart)
}
