using MediatR;
using Syncra.Application.DTOs.Analytics;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetWorkspaceSummaryQuery(Guid WorkspaceId, int Date) : IRequest<WorkspaceAnalyticsSummaryDto>;
