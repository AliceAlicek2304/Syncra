using System;
using System.Threading;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace Syncra.Infrastructure.Jobs;

public interface IIntegrationTokenRefreshJobScheduler
{
    void ScheduleRecurringJob();
}

public sealed class IntegrationTokenRefreshJobScheduler : IIntegrationTokenRefreshJobScheduler
{
    public const string JobId = "integration-token-refresh";

    private readonly IRecurringJobManager _recurringJobManager;
    private readonly ILogger<IntegrationTokenRefreshJobScheduler> _logger;

    public IntegrationTokenRefreshJobScheduler(
        IRecurringJobManager recurringJobManager,
        ILogger<IntegrationTokenRefreshJobScheduler> logger)
    {
        _recurringJobManager = recurringJobManager;
        _logger = logger;
    }

    public void ScheduleRecurringJob()
    {
        const int intervalMinutes = 15;

        _recurringJobManager.AddOrUpdate<IntegrationTokenRefreshJob>(
            JobId,
            job => job.ExecuteAsync(CancellationToken.None),
            Cron.MinuteInterval(intervalMinutes),
            TimeZoneInfo.Utc);

        _logger.LogInformation(
            "Scheduled integration token refresh job '{JobId}' to run every {IntervalMinutes} minutes.",
            JobId,
            intervalMinutes);
    }
}

