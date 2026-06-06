using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetContentDecayQueryHandler
    : IRequestHandler<GetContentDecayQuery, Result<ZernioContentDecayResponseDto>>
{
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<GetContentDecayQueryHandler> _logger;

    public GetContentDecayQueryHandler(
        IZernioClient zernioClient,
        ILogger<GetContentDecayQueryHandler> logger)
    {
        _zernioClient = zernioClient;
        _logger = logger;
    }

    public async Task<Result<ZernioContentDecayResponseDto>> Handle(
        GetContentDecayQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Fetching Zernio content-decay (workspace={WorkspaceId}, platform={Platform}, profileId={ProfileId}, source={Source})",
            request.WorkspaceId, request.Platform, request.ProfileId, request.Source);

        try
        {
            var result = await _zernioClient.GetContentDecayAsync(
                platform: request.Platform,
                profileId: request.ProfileId,
                accountId: request.AccountId,
                source: request.Source,
                cancellationToken: cancellationToken);

            return Result.Success(result);
        }
        catch (ZernioBadRequestException ex)
        {
            _logger.LogWarning(ex, "Zernio rejected content-decay request: {Message}", ex.Message);
            return Result.Failure<ZernioContentDecayResponseDto>(ex.Message);
        }
        catch (ZernioUnauthorizedException ex)
        {
            _logger.LogWarning(ex, "Zernio unauthorized for content-decay: {Message}", ex.Message);
            return Result.Failure<ZernioContentDecayResponseDto>(ex.Message);
        }
        catch (ZernioBillingRequiredException ex)
        {
            _logger.LogWarning(ex, "Zernio analytics add-on required for content-decay: {Message}", ex.Message);
            return Result.Failure<ZernioContentDecayResponseDto>(ex.Message);
        }
        catch (DomainException ex)
        {
            _logger.LogError(ex, "Zernio domain error fetching content-decay: {Message}", ex.Message);
            return Result.Failure<ZernioContentDecayResponseDto>(ex.Message);
        }
    }
}
