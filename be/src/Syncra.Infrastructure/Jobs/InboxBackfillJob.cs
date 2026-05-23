using System.Threading;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Jobs;

/// <summary>
/// Hangfire background job that triggers a 30-day inbox backfill for a given workspace.
/// Orchestrates calling Zernio list APIs for conversations, comments, and reviews,
/// then upserts results into local tables.
///
/// Designed to be triggered on first inbox open (D-09) or on-demand via POST .../inbox/sync.
/// Uses Hangfire's built-in retry (3 attempts) for transient failures.
/// </summary>
[AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
public sealed class InboxBackfillJob
{
    private readonly IInboxBackfillService _backfillService;
    private readonly ILogger<InboxBackfillJob> _logger;

    public InboxBackfillJob(
        IInboxBackfillService backfillService,
        ILogger<InboxBackfillJob> logger)
    {
        _backfillService = backfillService;
        _logger = logger;
    }

    /// <summary>
    /// Executes the backfill for the specified workspace.
    /// Called by Hangfire via job enqueue.
    /// </summary>
    /// <param name="workspaceId">The workspace to backfill.</param>
    /// <param name="cancellationToken">Hangfire cancellation token.</param>
    public async Task ExecuteAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "InboxBackfillJob started for workspace {WorkspaceId}.",
            workspaceId);

        var result = await _backfillService.BackfillAsync(workspaceId, cancellationToken);

        if (result.IsSuccess)
        {
            _logger.LogInformation(
                "InboxBackfillJob completed successfully for workspace {WorkspaceId}.",
                workspaceId);
        }
        else
        {
            _logger.LogWarning(
                "InboxBackfillJob completed with issues for workspace {WorkspaceId}: {Error}.",
                workspaceId,
                result.Error);
        }
    }
}
