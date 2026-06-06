using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetPostAnalyticsQueryHandler
    : IRequestHandler<GetPostAnalyticsQuery, Result<ZernioPostAnalyticsDto>>
{
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<GetPostAnalyticsQueryHandler> _logger;

    public GetPostAnalyticsQueryHandler(
        IZernioClient zernioClient,
        ILogger<GetPostAnalyticsQueryHandler> logger)
    {
        _zernioClient = zernioClient;
        _logger = logger;
    }

    public async Task<Result<ZernioPostAnalyticsDto>> Handle(
        GetPostAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Handling GetPostAnalyticsQuery for PostId: {PostId}", request.PostId);

        try
        {
            var result = await _zernioClient.GetPostAnalyticsAsync(
                postId: request.PostId,
                platform: request.Platform,
                profileId: request.ProfileId,
                accountId: request.AccountId,
                source: request.Source,
                fromDate: request.FromDate,
                toDate: request.ToDate,
                limit: request.Limit,
                page: request.Page,
                sortBy: request.SortBy,
                order: request.Order,
                cancellationToken: cancellationToken);

            return Result.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling GetPostAnalyticsQuery for PostId: {PostId}", request.PostId);
            return Result.Failure<ZernioPostAnalyticsDto>(ex.Message);
        }
    }
}
