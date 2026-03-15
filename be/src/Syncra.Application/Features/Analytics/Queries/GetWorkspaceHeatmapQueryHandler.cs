using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceHeatmapQueryHandler : IRequestHandler<GetWorkspaceHeatmapQuery, HeatmapDto>
{
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;

    public GetWorkspaceHeatmapQueryHandler(IWorkspaceAnalyticsService workspaceAnalyticsService)
    {
        _workspaceAnalyticsService = workspaceAnalyticsService;
    }

    public Task<HeatmapDto> Handle(
        GetWorkspaceHeatmapQuery request,
        CancellationToken cancellationToken)
        => _workspaceAnalyticsService.GetHeatmapAsync(request.WorkspaceId, request.Date, cancellationToken);
}
