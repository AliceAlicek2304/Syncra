using MediatR;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetPostAnalyticsQuery(
    Guid WorkspaceId,
    Guid PostId,
    int Date) : IRequest<List<AnalyticsData>>;
