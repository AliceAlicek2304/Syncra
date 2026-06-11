namespace Syncra.Domain.Entities;

public sealed class RepurposeAtom : EntityBase
{
    public Guid SessionId { get; private set; }
    public string Platform { get; private set; } = string.Empty;
    public string Type { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public string? Title { get; private set; }
    public string? SuggestedHashtags { get; private set; } 
    public string? SuggestedCTA { get; private set; }
    public string? MediaUrl { get; private set; }
    public string? MediaType { get; private set; }

    // Navigation property
    public RepurposeSession Session { get; set; } = null!;

    private RepurposeAtom() { }

    public static RepurposeAtom Create(
        Guid sessionId, 
        string platform, 
        string type, 
        string content, 
        string? title = null, 
        string? suggestedHashtags = null,
        string? suggestedCta = null,
        string? mediaUrl = null,
        string? mediaType = null)
    {
        return new RepurposeAtom
        {
            SessionId = sessionId,
            Platform = platform.ToLower(),
            Type = type.ToUpper(),
            Content = content,
            Title = title,
            SuggestedHashtags = suggestedHashtags,
            SuggestedCTA = suggestedCta,
            MediaUrl = mediaUrl,
            MediaType = mediaType,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }
}
