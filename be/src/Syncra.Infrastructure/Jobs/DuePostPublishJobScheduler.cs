using System.Threading;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace Syncra.Infrastructure.Jobs;

public interface IDuePostPublishJobScheduler
{
    void ScheduleRecurringJob();
}

public sealed class DuePostPublishJobScheduler : IDuePostPublishJobScheduler
{
    public const string JobId = "due-post-publish";

    private readonly IRecurringJobManager _recurringJobManager;
    private readonly ILogger<DuePostPublishJobScheduler> _logger;

    public DuePostPublishJobScheduler(
        IRecurringJobManager recurringJobManager,
        ILogger<DuePostPublishJobScheduler> logger)
    {
        _recurringJobManager = recurringJobManager;
        _logger = logger;
    }

    public void ScheduleRecurringJob()
    {
        const int intervalMinutes = 1;

        _recurringJobManager.AddOrUpdate<DuePostPublishJob>(
            JobId,
            job => job.ExecuteAsync(CancellationToken.None),
            Cron.MinuteInterval(intervalMinutes),
            TimeZoneInfo.Utc);

        _logger.LogInformation(
            "Scheduled due-post publish job '{JobId}' to run every {IntervalMinutes} minutes.",
            JobId,
            intervalMinutes);
    }
}

