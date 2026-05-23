using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetPostAnalyticsQueryHandler
    : IRequestHandler<GetPostAnalyticsQuery, Result<PostMetricsDto>>
{
    private readonly IZernioWorkspaceAnalyticsService _zernioAnalyticsService;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IPostRepository _postRepository;
    private readonly ILogger<GetPostAnalyticsQueryHandler> _logger;

    public GetPostAnalyticsQueryHandler(
        IZernioWorkspaceAnalyticsService zernioAnalyticsService,
        IZernioProfileRepository zernioProfileRepository,
        IPostRepository postRepository,
        ILogger<GetPostAnalyticsQueryHandler> logger)
    {
        _zernioAnalyticsService = zernioAnalyticsService;
        _zernioProfileRepository = zernioProfileRepository;
        _postRepository = postRepository;
        _logger = logger;
    }

    public async Task<Result<PostMetricsDto>> Handle(
        GetPostAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        // Check if workspace has a Zernio profile
        var zernioProfile = await _zernioProfileRepository
            .GetByWorkspaceIdAsync(request.WorkspaceId);

        if (zernioProfile is null)
        {
            _logger.LogDebug(
                "No Zernio profile for workspace {WorkspaceId}; post analytics unavailable",
                request.WorkspaceId);

            return Result<PostMetricsDto>.Failure(
                "Analytics are not available for this workspace. Connect a Zernio integration to view post-level metrics.");
        }

        // Load the post and check for ZernioPostId
        var post = await _postRepository.GetByIdAsync(request.PostId);

        if (post is null)
        {
            return Result<PostMetricsDto>.Failure("Post not found.");
        }

        if (string.IsNullOrWhiteSpace(post.ZernioPostId))
        {
            _logger.LogDebug(
                "Post {PostId} has no ZernioPostId; Zernio analytics not available",
                request.PostId);

            return Result<PostMetricsDto>.Failure(
                "Analytics are not yet available for this post. It may still be publishing or was created before analytics tracking was enabled.");
        }

        _logger.LogDebug(
            "Using Zernio analytics path for post {PostId} in workspace {WorkspaceId}",
            request.PostId, request.WorkspaceId);

        return await _zernioAnalyticsService.GetPostMetricsAsync(
            request.WorkspaceId,
            request.PostId,
            cancellationToken);
    }
}
