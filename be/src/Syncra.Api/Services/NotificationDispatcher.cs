using Microsoft.AspNetCore.SignalR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Api.Hubs;

namespace Syncra.Api.Services;

public sealed class NotificationDispatcher : INotificationDispatcher
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationDispatcher(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task DispatchAsync(Notification notification, CancellationToken cancellationToken = default)
    {
        var groupName = $"workspace:{notification.WorkspaceId}";
        
        var payload = new 
        {
            id = notification.Id,
            workspaceId = notification.WorkspaceId,
            type = notification.Type,
            title = notification.Title,
            body = notification.Body,
            createdAtUtc = notification.CreatedAtUtc,
            readAtUtc = notification.ReadAtUtc
        };

        await _hubContext.Clients.Group(groupName).SendAsync("notification", payload, cancellationToken);
    }
}
