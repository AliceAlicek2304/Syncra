using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetAnalyticsListQueryHandler
    : IRequestHandler<GetAnalyticsListQuery, Result<ZernioPostAnalyticsListDto>>
{
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<GetAnalyticsListQueryHandler> _logger;

    public GetAnalyticsListQueryHandler(
        IZernioClient zernioClient,
        ILogger<GetAnalyticsListQueryHandler> logger)
    {
        _zernioClient = zernioClient;
        _logger = logger;
    }

    public async Task<Result<ZernioPostAnalyticsListDto>> Handle(
        GetAnalyticsListQuery request,
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug(
                "Fetching Zernio analytics list (platform={Platform}, profileId={ProfileId}, fromDate={FromDate}, toDate={ToDate}, limit={Limit}, page={Page})",
                request.Platform, request.ProfileId, request.FromDate, request.ToDate, request.Limit, request.Page);

            var list = await _zernioClient.GetAnalyticsListAsync(
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

            return Result.Success(list);
        }
        catch (ZernioBadRequestException ex)
        {
            _logger.LogWarning(ex, "Zernio rejected analytics list request: {Message}", ex.Message);
            return Result.Failure<ZernioPostAnalyticsListDto>(ex.Message);
        }
        catch (ZernioUnauthorizedException ex)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for analytics list: {Message}", ex.Message);
            return Result.Failure<ZernioPostAnalyticsListDto>(ex.Message);
        }
        catch (ZernioNotFoundException ex)
        {
            _logger.LogWarning(ex, "Zernio not-found for analytics list: {Message}", ex.Message);
            return Result.Failure<ZernioPostAnalyticsListDto>(ex.Message);
        }
        catch (ZernioServerException ex)
        {
            _logger.LogError(ex, "Zernio server error during analytics list: {Message}", ex.Message);
            return Result.Failure<ZernioPostAnalyticsListDto>(ex.Message);
        }
    }
}
