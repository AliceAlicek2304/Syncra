using MediatR;
using Syncra.Application.DTOs.Analytics;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetWorkspaceHeatmapQuery(Guid WorkspaceId, int Date) : IRequest<HeatmapDto>;
