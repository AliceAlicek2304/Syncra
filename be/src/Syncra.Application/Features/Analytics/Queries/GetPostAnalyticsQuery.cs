using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetPostAnalyticsQuery(
    Guid WorkspaceId,
    Guid PostId,
    int Date) : IRequest<Result<PostMetricsDto>>;
