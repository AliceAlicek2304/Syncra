using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceSummaryQueryHandler
    : IRequestHandler<GetWorkspaceSummaryQuery, Result<WorkspaceAnalyticsSummaryDto>>
{
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;
    private readonly IZernioWorkspaceAnalyticsService _zernioAnalyticsService;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ILogger<GetWorkspaceSummaryQueryHandler> _logger;

    public GetWorkspaceSummaryQueryHandler(
        IWorkspaceAnalyticsService workspaceAnalyticsService,
        IZernioWorkspaceAnalyticsService zernioAnalyticsService,
        IZernioProfileRepository zernioProfileRepository,
        ILogger<GetWorkspaceSummaryQueryHandler> logger)
    {
        _workspaceAnalyticsService = workspaceAnalyticsService;
        _zernioAnalyticsService = zernioAnalyticsService;
        _zernioProfileRepository = zernioProfileRepository;
        _logger = logger;
    }

    public async Task<Result<WorkspaceAnalyticsSummaryDto>> Handle(
        GetWorkspaceSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var zernioProfile = await _zernioProfileRepository
            .GetByWorkspaceIdAsync(request.WorkspaceId);

        if (zernioProfile is not null)
        {
            _logger.LogDebug(
                "Using Zernio analytics path for workspace {WorkspaceId}",
                request.WorkspaceId);

            return await _zernioAnalyticsService.GetSummaryAsync(
                request.WorkspaceId,
                request.Date,
                cancellationToken);
        }

        _logger.LogDebug(
            "Using legacy analytics path for workspace {WorkspaceId}",
            request.WorkspaceId);

        return await _workspaceAnalyticsService.GetSummaryAsync(
            request.WorkspaceId,
            request.Date,
            cancellationToken);
    }
}
