using MediatR;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Admin.Queries.RevenueAnalytics;

public sealed record GetRevenueAnalyticsQuery : IRequest<Result<RevenueAnalyticsDto>>;
