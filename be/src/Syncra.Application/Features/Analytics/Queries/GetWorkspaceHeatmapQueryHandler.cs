using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceHeatmapQueryHandler
    : IRequestHandler<GetWorkspaceHeatmapQuery, Result<HeatmapDto>>
{
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;
    private readonly IZernioWorkspaceAnalyticsService _zernioAnalyticsService;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ILogger<GetWorkspaceHeatmapQueryHandler> _logger;

    public GetWorkspaceHeatmapQueryHandler(
        IWorkspaceAnalyticsService workspaceAnalyticsService,
        IZernioWorkspaceAnalyticsService zernioAnalyticsService,
        IZernioProfileRepository zernioProfileRepository,
        ILogger<GetWorkspaceHeatmapQueryHandler> logger)
    {
        _workspaceAnalyticsService = workspaceAnalyticsService;
        _zernioAnalyticsService = zernioAnalyticsService;
        _zernioProfileRepository = zernioProfileRepository;
        _logger = logger;
    }

    public async Task<Result<HeatmapDto>> Handle(
        GetWorkspaceHeatmapQuery request,
        CancellationToken cancellationToken)
    {
        var zernioProfile = await _zernioProfileRepository
            .GetByWorkspaceIdAsync(request.WorkspaceId);

        if (zernioProfile is not null)
        {
            _logger.LogDebug(
                "Using Zernio heatmap path for workspace {WorkspaceId} (platform={Platform})",
                request.WorkspaceId, request.Platform);

            return await _zernioAnalyticsService.GetHeatmapAsync(
                request.WorkspaceId,
                request.Date,
                request.Platform,
                cancellationToken);
        }

        _logger.LogDebug(
            "Using legacy heatmap path for workspace {WorkspaceId}",
            request.WorkspaceId);

        return await _workspaceAnalyticsService.GetHeatmapAsync(
            request.WorkspaceId,
            request.Date,
            cancellationToken);
    }
}
