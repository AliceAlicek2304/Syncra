using MediatR;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetAnalyticsExportQuery(
    Guid WorkspaceId,
    int? Days,
    DateTime? StartUtc,
    DateTime? EndUtc
) : IRequest<Result<byte[]>>;
