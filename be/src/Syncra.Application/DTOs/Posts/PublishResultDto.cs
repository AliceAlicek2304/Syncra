namespace Syncra.Application.DTOs.Posts;

public record PublishResultDto(
    bool Success,
    string? ExternalId,
    string? ExternalUrl,
    string? ErrorCode,
    string? ErrorMessage,
    string? RawMetadata);

