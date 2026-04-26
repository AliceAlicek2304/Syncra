using MediatR;
using Syncra.Domain.Common;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetIntegrationAnalyticsQuery(
    Guid WorkspaceId,
    Guid IntegrationId,
    int Date) : IRequest<Result<List<AnalyticsData>>>;
