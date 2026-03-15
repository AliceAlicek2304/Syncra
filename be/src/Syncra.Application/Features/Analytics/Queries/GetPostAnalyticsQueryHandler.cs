using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetPostAnalyticsQueryHandler
    : IRequestHandler<GetPostAnalyticsQuery, List<AnalyticsData>>
{
    private readonly IIntegrationAnalyticsService _analyticsService;

    public GetPostAnalyticsQueryHandler(IIntegrationAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    public Task<List<AnalyticsData>> Handle(
        GetPostAnalyticsQuery request,
        CancellationToken cancellationToken)
        => _analyticsService.CheckPostAnalyticsAsync(
            request.WorkspaceId,
            request.PostId,
            request.Date,
            cancellationToken);
}
