namespace Syncra.Application.Interfaces;

public interface IInboxNotifier
{
    Task NotifyItemCreatedAsync(
        Guid workspaceId,
        string type,
        string id,
        string preview,
        string platform,
        string? accountId,
        int unreadDelta,
        CancellationToken cancellationToken = default);
}
