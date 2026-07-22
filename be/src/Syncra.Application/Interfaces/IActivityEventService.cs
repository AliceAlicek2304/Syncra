namespace Syncra.Application.Interfaces;

public sealed record ActivityEventRequest(
    string EventType,
    string EventGroup,
    string Status,
    string Title,
    string? Description = null,
    Guid? WorkspaceId = null,
    Guid? UserId = null,
    string? SubjectType = null,
    string? SubjectId = null,
    IReadOnlyDictionary<string, string?>? Metadata = null);

public interface IActivityEventService
{
    Task RecordAsync(ActivityEventRequest request, CancellationToken cancellationToken = default);
}
