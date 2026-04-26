using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceHeatmapQueryHandler : IRequestHandler<GetWorkspaceHeatmapQuery, Result<HeatmapDto>>
{
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;

    public GetWorkspaceHeatmapQueryHandler(IWorkspaceAnalyticsService workspaceAnalyticsService)
    {
        _workspaceAnalyticsService = workspaceAnalyticsService;
    }

    public Task<Result<HeatmapDto>> Handle(
        GetWorkspaceHeatmapQuery request,
        CancellationToken cancellationToken)
        => _workspaceAnalyticsService.GetHeatmapAsync(request.WorkspaceId, request.Date, cancellationToken);
}
