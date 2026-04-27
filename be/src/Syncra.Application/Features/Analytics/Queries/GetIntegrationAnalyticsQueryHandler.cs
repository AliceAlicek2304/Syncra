using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetIntegrationAnalyticsQueryHandler
    : IRequestHandler<GetIntegrationAnalyticsQuery, Result<List<AnalyticsData>>>
{
    private readonly IIntegrationAnalyticsService _analyticsService;

    public GetIntegrationAnalyticsQueryHandler(IIntegrationAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    public Task<Result<List<AnalyticsData>>> Handle(
        GetIntegrationAnalyticsQuery request,
        CancellationToken cancellationToken)
        => _analyticsService.CheckAnalyticsAsync(
            request.WorkspaceId,
            request.IntegrationId,
            request.Date,
            cancellationToken);
}
