using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetWorkspaceHeatmapQuery(
    Guid WorkspaceId,
    int Date,
    string? Platform = null) : IRequest<Result<HeatmapDto>>;
