using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetIntegrationAnalyticsQueryHandler
    : IRequestHandler<GetIntegrationAnalyticsQuery, List<AnalyticsData>>
{
    private readonly IIntegrationAnalyticsService _analyticsService;

    public GetIntegrationAnalyticsQueryHandler(IIntegrationAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    public Task<List<AnalyticsData>> Handle(
        GetIntegrationAnalyticsQuery request,
        CancellationToken cancellationToken)
        => _analyticsService.CheckAnalyticsAsync(
            request.WorkspaceId,
            request.IntegrationId,
            request.Date,
            cancellationToken);
}
