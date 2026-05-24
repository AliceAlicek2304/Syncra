using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceHeatmapQueryHandler
    : IRequestHandler<GetWorkspaceHeatmapQuery, Result<HeatmapDto>>
{
    private readonly IZernioWorkspaceAnalyticsService _zernioAnalyticsService;
    private readonly ILogger<GetWorkspaceHeatmapQueryHandler> _logger;

    public GetWorkspaceHeatmapQueryHandler(
        IZernioWorkspaceAnalyticsService zernioAnalyticsService,
        ILogger<GetWorkspaceHeatmapQueryHandler> logger)
    {
        _zernioAnalyticsService = zernioAnalyticsService;
        _logger = logger;
    }

    public async Task<Result<HeatmapDto>> Handle(
        GetWorkspaceHeatmapQuery request,
        CancellationToken cancellationToken)
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
}
