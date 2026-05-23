using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class RefreshAnalyticsCommandHandler
    : IRequestHandler<RefreshAnalyticsCommand, Result>
{
    private static readonly int[] PresetDays = [7, 30, 90];

    private readonly IAnalyticsCache _cache;
    private readonly ILogger<RefreshAnalyticsCommandHandler> _logger;

    public RefreshAnalyticsCommandHandler(
        IAnalyticsCache cache,
        ILogger<RefreshAnalyticsCommandHandler> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<Result> Handle(
        RefreshAnalyticsCommand request,
        CancellationToken cancellationToken)
    {
        var workspaceId = request.WorkspaceId;
        var keysToDelete = new List<string>(PresetDays.Length * 6);

        var knownPlatforms = new[] { "all", "facebook", "instagram", "tiktok", "twitter",
            "linkedin", "youtube", "pinterest", "snapchat", "googlebusiness" };

        foreach (var days in PresetDays)
        {
            // New Zernio cache keys with platform suffix
            keysToDelete.Add($"zernio:analytics:summary:{workspaceId}:{days}");

            foreach (var platform in knownPlatforms)
            {
                keysToDelete.Add($"zernio:analytics:heatmap:{workspaceId}:{days}:{platform}");
            }

            // Legacy cache keys
            keysToDelete.Add($"analytics:summary:{workspaceId}:{days}");
            keysToDelete.Add($"analytics:heatmap:{workspaceId}:{days}");
        }

        var tasks = keysToDelete.Select(key => _cache.RemoveAsync(key, cancellationToken));
        await Task.WhenAll(tasks);

        _logger.LogInformation(
            "Refreshed analytics cache for workspace {WorkspaceId}: {KeyCount} keys cleared",
            workspaceId, keysToDelete.Count);

        return Result.Success();
    }
}
