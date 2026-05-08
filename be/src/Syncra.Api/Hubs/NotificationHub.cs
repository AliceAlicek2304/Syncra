using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Syncra.Api.Hubs;

[Authorize]
public sealed class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var workspaceId = Context.GetHttpContext()?.Request.Query["workspaceId"].ToString();
        if (!string.IsNullOrWhiteSpace(workspaceId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"workspace:{workspaceId}");
        }

        await base.OnConnectedAsync();
    }
}
