namespace Syncra.Api.Controllers;

public sealed record ActivityEventsResponseDto(
    int RetentionDays,
    DateTime GeneratedAtUtc,
    IReadOnlyList<ActivityMetricDto> GroupCounts24h,
    IReadOnlyList<ActivityMetricDto> StatusCounts24h,
    IReadOnlyList<ActivityEventDto> Events);

public sealed record ActivityMetricDto(string Key, int Count);

public sealed record ActivityEventDto(
    Guid Id,
    Guid? WorkspaceId,
    string? WorkspaceName,
    Guid? UserId,
    string? UserEmail,
    string EventType,
    string EventGroup,
    string Status,
    string Title,
    string? Description,
    string? SubjectType,
    string? SubjectId,
    string? Metadata,
    DateTime CreatedAtUtc);
