using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetBestTimeQueryHandler
    : IRequestHandler<GetBestTimeQuery, Result<ZernioBestTimeDto>>
{
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<GetBestTimeQueryHandler> _logger;

    public GetBestTimeQueryHandler(
        IZernioClient zernioClient,
        ILogger<GetBestTimeQueryHandler> logger)
    {
        _zernioClient = zernioClient;
        _logger = logger;
    }

    public async Task<Result<ZernioBestTimeDto>> Handle(
        GetBestTimeQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Fetching Zernio best-time (workspace={WorkspaceId}, platform={Platform}, profileId={ProfileId}, source={Source})",
            request.WorkspaceId, request.Platform, request.ProfileId, request.Source);

        try
        {
            var result = await _zernioClient.GetBestTimeAsync(
                platform: request.Platform,
                profileId: request.ProfileId,
                accountId: request.AccountId,
                source: request.Source,
                cancellationToken: cancellationToken);

            return Result.Success(result);
        }
        catch (ZernioBadRequestException ex)
        {
            _logger.LogWarning(ex, "Zernio rejected best-time request: {Message}", ex.Message);
            return Result.Failure<ZernioBestTimeDto>(ex.Message);
        }
        catch (ZernioUnauthorizedException ex)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for best-time: {Message}", ex.Message);
            return Result.Failure<ZernioBestTimeDto>(ex.Message);
        }
        catch (ZernioBillingRequiredException ex)
        {
            _logger.LogWarning(ex, "Zernio analytics add-on required for best-time: {Message}", ex.Message);
            return Result.Failure<ZernioBestTimeDto>(ex.Message);
        }
        catch (DomainException ex)
        {
            _logger.LogError(ex, "Zernio domain error fetching best-time: {Message}", ex.Message);
            return Result.Failure<ZernioBestTimeDto>(ex.Message);
        }
    }
}
