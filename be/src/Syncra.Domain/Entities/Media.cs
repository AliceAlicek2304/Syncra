using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;

namespace Syncra.Domain.Entities;

public sealed class Media : WorkspaceEntityBase
{
    // Properties with private setters
    public Guid? PostId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string FileUrl { get; private set; } = string.Empty;
    public string MediaType { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }

    // Navigation properties
    public Post? Post { get; set; }
    public Workspace Workspace { get; set; } = null!;

    // Private parameterless constructor for EF Core
    private Media() { }

    // Factory method
    public static Media Create(
        Guid workspaceId,
        string fileName,
        string fileUrl,
        string mimeType,
        long sizeBytes)
    {
        var now = DateTime.UtcNow;
        var mediaType = ParseMediaType(mimeType);

        return new Media
        {
            WorkspaceId = workspaceId,
            FileName = fileName,
            FileUrl = fileUrl,
            MediaType = mediaType,
            MimeType = mimeType,
            SizeBytes = sizeBytes,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    // Domain behaviors

    public bool IsImage => MediaType == "image";
    public bool IsVideo => MediaType == "video";
    public bool IsAudio => MediaType == "audio";
    public bool IsAttachedToPost => PostId.HasValue;

    public void AttachToPost(Guid postId)
    {
        if (PostId.HasValue && PostId != postId)
        {
            throw new DomainException(
                "invalid_operation",
                "Media is already attached to another post.");
        }

        PostId = postId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void DetachFromPost()
    {
        if (!PostId.HasValue)
        {
            throw new DomainException(
                "invalid_operation",
                "Media is not attached to any post.");
        }

        PostId = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool CanBeDeleted() => !IsAttachedToPost || Post?.Status != PostStatus.Published;

    public void MarkAsDeleted()
    {
        if (!CanBeDeleted())
        {
            throw new DomainException(
                "invalid_operation",
                "Cannot delete media attached to a published post.");
        }

        base.MarkAsDeleted();
    }

    private static string ParseMediaType(string mimeType)
    {
        if (string.IsNullOrWhiteSpace(mimeType))
            return "unknown";

        return mimeType.ToLowerInvariant() switch
        {
            var m when m.StartsWith("image/") => "image",
            var m when m.StartsWith("video/") => "video",
            var m when m.StartsWith("audio/") => "audio",
            _ => "other"
        };
    }
}