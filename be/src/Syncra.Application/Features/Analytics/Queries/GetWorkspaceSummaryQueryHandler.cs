using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceSummaryQueryHandler
    : IRequestHandler<GetWorkspaceSummaryQuery, WorkspaceAnalyticsSummaryDto>
{
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;

    public GetWorkspaceSummaryQueryHandler(IWorkspaceAnalyticsService workspaceAnalyticsService)
    {
        _workspaceAnalyticsService = workspaceAnalyticsService;
    }

    public Task<WorkspaceAnalyticsSummaryDto> Handle(
        GetWorkspaceSummaryQuery request,
        CancellationToken cancellationToken)
        => _workspaceAnalyticsService.GetSummaryAsync(request.WorkspaceId, request.Date, cancellationToken);
}
