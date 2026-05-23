using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Api.Hubs;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Api.Services;

public sealed class PostStatusNotifier : IPostStatusNotifier
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<PostStatusNotifier> _logger;

    public PostStatusNotifier(IHubContext<NotificationHub> hubContext, ILogger<PostStatusNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyAsync(
        Guid workspaceId,
        Guid postId,
        string status,
        int zernioTargetCount,
        IReadOnlyList<PostStatusTargetPayload> platformTargets,
        CancellationToken cancellationToken = default)
    {
        var groupName = $"workspace:{workspaceId}";

        var payload = new
        {
            postId,
            status,
            zernioTargetCount,
            platformTargets
        };

        try
        {
            await _hubContext.Clients.Group(groupName).SendAsync("post.statusUpdated", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SignalR post.statusUpdated notification for post {PostId} in workspace {WorkspaceId}.", postId, workspaceId);
        }
    }
}
