using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetWorkspaceSummaryQuery(Guid WorkspaceId, int Date) : IRequest<Result<WorkspaceAnalyticsSummaryDto>>;
