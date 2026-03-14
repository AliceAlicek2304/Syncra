using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure.Jobs;

public sealed class IntegrationTokenRefreshJob
{
    private readonly IIntegrationTokenRefreshService _refreshService;
    private readonly ILogger<IntegrationTokenRefreshJob> _logger;

    public IntegrationTokenRefreshJob(
        IIntegrationTokenRefreshService refreshService,
        ILogger<IntegrationTokenRefreshJob> logger)
    {
        _refreshService = refreshService;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting integration token refresh job.");

        var result = await _refreshService.RefreshExpiringIntegrationsAsync(cancellationToken);

        _logger.LogInformation(
            "Completed integration token refresh job. Total={Total}, Attempted={Attempted}, Refreshed={Refreshed}, Failed={Failed}, SkippedNotEligible={SkippedNotEligible}, SkippedNotExpiring={SkippedNotExpiring}",
            result.TotalConsidered,
            result.Attempted,
            result.Refreshed,
            result.Failed,
            result.SkippedNotEligible,
            result.SkippedNotExpiring);
    }
}

