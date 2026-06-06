using MediatR;
using Syncra.Application.DTOs.Zernio;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetAnalyticsListQuery(
    string? Platform,
    string? ProfileId,
    string? AccountId,
    string? Source,
    DateOnly? FromDate,
    DateOnly? ToDate,
    int? Limit,
    int? Page,
    string? SortBy,
    string? Order) : IRequest<Result<ZernioPostAnalyticsListDto>>;
