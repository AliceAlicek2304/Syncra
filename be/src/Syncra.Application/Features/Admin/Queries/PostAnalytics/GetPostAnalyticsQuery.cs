using MediatR;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Admin.Queries.PostAnalytics;

public sealed record GetPostAnalyticsQuery : IRequest<Result<PostAnalyticsDto>>;
