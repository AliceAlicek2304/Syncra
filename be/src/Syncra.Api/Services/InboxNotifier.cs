using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Api.Hubs;

namespace Syncra.Api.Services;

public sealed class InboxNotifier : IInboxNotifier
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<InboxNotifier> _logger;

    public InboxNotifier(IHubContext<NotificationHub> hubContext, ILogger<InboxNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyItemCreatedAsync(
        Guid workspaceId,
        string type,
        string id,
        string preview,
        string platform,
        string? accountId,
        int unreadDelta,
        CancellationToken cancellationToken = default)
    {
        var groupName = $"workspace:{workspaceId}";

        var payload = new
        {
            type,
            id,
            preview,
            platform,
            accountId,
            unreadDelta
        };

        try
        {
            await _hubContext.Clients.Group(groupName).SendAsync("inbox.itemCreated", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to send SignalR inbox.itemCreated notification for workspace {WorkspaceId}, type {Type}.",
                workspaceId,
                type);
        }
    }
}
