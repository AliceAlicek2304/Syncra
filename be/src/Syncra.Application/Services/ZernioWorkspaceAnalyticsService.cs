using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Services;

public sealed class ZernioWorkspaceAnalyticsService : IZernioWorkspaceAnalyticsService
{
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IPostRepository _postRepository;
    private readonly IAnalyticsCache _cache;
    private readonly ILogger<ZernioWorkspaceAnalyticsService> _logger;

    public ZernioWorkspaceAnalyticsService(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        IPostRepository postRepository,
        IAnalyticsCache cache,
        ILogger<ZernioWorkspaceAnalyticsService> logger)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _postRepository = postRepository;
        _cache = cache;
        _logger = logger;
    }

    public Task<Result<WorkspaceAnalyticsSummaryDto>> GetSummaryAsync(
        Guid workspaceId,
        int date = 30,
        CancellationToken cancellationToken = default)
    {
        // RED phase — will be implemented in Task 2 (GREEN)
        throw new NotImplementedException();
    }

    public Task<Result<PostMetricsDto>> GetPostMetricsAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default)
    {
        // RED phase — will be implemented in Task 2 (GREEN)
        throw new NotImplementedException();
    }
}
