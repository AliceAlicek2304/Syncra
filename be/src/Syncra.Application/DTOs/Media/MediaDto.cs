namespace Syncra.Application.DTOs.Media;

public record MediaDto(
    Guid Id,
    Guid WorkspaceId,
    string FileName,
    string Url,
    string MediaType,
    string MimeType,
    long SizeBytes,
    Guid? PostId,
    Guid? IdeaId,
    DateTime CreatedAtUtc);

public record MediaListDto(
    IEnumerable<MediaDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
