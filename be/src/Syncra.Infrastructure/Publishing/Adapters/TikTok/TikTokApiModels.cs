using System.Text.Json.Serialization;

namespace Syncra.Infrastructure.Publishing.Adapters.TikTok;

#region Video Publish Models

public record TikTokVideoInitRequest(
    [property: JsonPropertyName("post_info")] TikTokPostInfo PostInfo,
    [property: JsonPropertyName("source_info")] TikTokVideoSourceInfo SourceInfo);

public record TikTokVideoSourceInfo(
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("video_size")] long? VideoSize = null,
    [property: JsonPropertyName("chunk_size")] long? ChunkSize = null,
    [property: JsonPropertyName("total_chunk_count")] int? TotalChunkCount = null,
    [property: JsonPropertyName("video_url")] string? VideoUrl = null);

public record TikTokPostInfo(
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("privacy_level")] string? PrivacyLevel = null,
    [property: JsonPropertyName("disable_duet")] bool? DisableDuet = null,
    [property: JsonPropertyName("disable_comment")] bool? DisableComment = null,
    [property: JsonPropertyName("disable_stitch")] bool? DisableStitch = null,
    [property: JsonPropertyName("video_cover_timestamp_ms")] long? VideoCoverTimestampMs = null);

public record TikTokVideoInitResponse(
    [property: JsonPropertyName("data")] TikTokVideoInitData Data,
    [property: JsonPropertyName("error")] TikTokError Error);

public record TikTokVideoInitData(
    [property: JsonPropertyName("publish_id")] string PublishId,
    [property: JsonPropertyName("upload_url")] string? UploadUrl = null);

#endregion

#region Content (Photo) Publish Models

public record TikTokContentInitRequest(
    [property: JsonPropertyName("post_info")] TikTokContentPostInfo PostInfo,
    [property: JsonPropertyName("source_info")] TikTokContentSourceInfo SourceInfo,
    [property: JsonPropertyName("post_mode")] string PostMode = "MEDIA_UPLOAD",
    [property: JsonPropertyName("media_type")] string MediaType = "PHOTO");

public record TikTokContentPostInfo(
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("description")] string? Description = null,
    [property: JsonPropertyName("privacy_level")] string? PrivacyLevel = null);

public record TikTokContentSourceInfo(
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("photo_images")] List<string> PhotoImages,
    [property: JsonPropertyName("photo_cover_index")] int PhotoCoverIndex = 0);

public record TikTokContentInitResponse(
    [property: JsonPropertyName("data")] TikTokContentInitData Data,
    [property: JsonPropertyName("error")] TikTokError Error);

public record TikTokContentInitData(
    [property: JsonPropertyName("publish_id")] string PublishId);

#endregion

#region Common Models

public record TikTokError(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("log_id")] string LogId);

public record TikTokStatusRequest(
    [property: JsonPropertyName("publish_id")] string PublishId);

public record TikTokStatusResponse(
    [property: JsonPropertyName("data")] TikTokStatusData Data,
    [property: JsonPropertyName("error")] TikTokError Error);

public record TikTokStatusData(
    [property: JsonPropertyName("publish_id")] string PublishId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("fail_reason")] string? FailReason = null,
    [property: JsonPropertyName("public_url")] string? PublicUrl = null);

#endregion
