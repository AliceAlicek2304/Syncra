using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetWorkspaceSummaryQueryHandler
    : IRequestHandler<GetWorkspaceSummaryQuery, Result<WorkspaceAnalyticsSummaryDto>>
{
    private readonly IWorkspaceAnalyticsService _workspaceAnalyticsService;

    public GetWorkspaceSummaryQueryHandler(IWorkspaceAnalyticsService workspaceAnalyticsService)
    {
        _workspaceAnalyticsService = workspaceAnalyticsService;
    }

    public Task<Result<WorkspaceAnalyticsSummaryDto>> Handle(
        GetWorkspaceSummaryQuery request,
        CancellationToken cancellationToken)
        => _workspaceAnalyticsService.GetSummaryAsync(request.WorkspaceId, request.Date, cancellationToken);
}
