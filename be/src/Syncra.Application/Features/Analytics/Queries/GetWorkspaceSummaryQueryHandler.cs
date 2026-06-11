using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceSummaryQueryHandler
    : IRequestHandler<GetWorkspaceSummaryQuery, Result<WorkspaceAnalyticsSummaryDto>>
{
    private readonly IZernioWorkspaceAnalyticsService _zernioAnalyticsService;
    private readonly ILogger<GetWorkspaceSummaryQueryHandler> _logger;

    public GetWorkspaceSummaryQueryHandler(
        IZernioWorkspaceAnalyticsService zernioAnalyticsService,
        ILogger<GetWorkspaceSummaryQueryHandler> logger)
    {
        _zernioAnalyticsService = zernioAnalyticsService;
        _logger = logger;
    }

    public async Task<Result<WorkspaceAnalyticsSummaryDto>> Handle(
        GetWorkspaceSummaryQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Using Zernio analytics path for workspace {WorkspaceId}",
            request.WorkspaceId);

        return await _zernioAnalyticsService.GetSummaryAsync(
            request.WorkspaceId,
            request.Date,
            request.ProfileId,
            cancellationToken);
    }
}
