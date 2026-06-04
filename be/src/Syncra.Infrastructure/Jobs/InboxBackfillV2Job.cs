using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Jobs;

/// <summary>
/// Re-runs the 30-day inbox backfill across all workspaces on a recurring schedule.
/// Purpose: rebuilds <c>inbox_commented_posts</c> rows and eagerly populates the
/// <c>inbox_comment_threads</c> cache (which webhooks do NOT touch — D-15).
///
/// Idempotent: <see cref="IInboxBackfillService.BackfillAsync"/> uses upserts.
/// On first run after a schema migration, this catches workspaces that were
/// active before the migration and never had thread cache entries written.
///
/// Schedule: hourly. Each run walks all workspaces and is bounded by Zernio API
/// rate limits; we keep it cheap by relying on the natural 30-day window.
/// </summary>
public class InboxBackfillV2Job
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IInboxBackfillService _backfillService;
    private readonly ILogger<InboxBackfillV2Job> _logger;

    public InboxBackfillV2Job(
        IWorkspaceRepository workspaceRepository,
        IInboxBackfillService backfillService,
        ILogger<InboxBackfillV2Job> logger)
    {
        _workspaceRepository = workspaceRepository;
        _backfillService = backfillService;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting inbox schema-v2 backfill job.");

        IReadOnlyList<Domain.Entities.Workspace> workspaces;
        try
        {
            workspaces = await _workspaceRepository.GetAllAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enumerate workspaces for schema-v2 backfill.");
            return;
        }

        var totalWorkspaces = workspaces.Count;
        var processedWorkspaces = 0;
        var failedWorkspaces = 0;

        foreach (var workspace in workspaces)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            try
            {
                var result = await _backfillService.BackfillAsync(workspace.Id, cancellationToken);
                if (result.IsSuccess)
                {
                    processedWorkspaces++;
                }
                else
                {
                    failedWorkspaces++;
                    _logger.LogWarning(
                        "Schema-v2 backfill reported failure for workspace {WorkspaceId}: {Error}",
                        workspace.Id,
                        result.Error);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                failedWorkspaces++;
                _logger.LogError(
                    ex,
                    "Schema-v2 backfill threw for workspace {WorkspaceId} — continuing.",
                    workspace.Id);
            }
        }

        _logger.LogInformation(
            "Inbox schema-v2 backfill job complete. Total: {Total}, Processed: {Processed}, Failed: {Failed}.",
            totalWorkspaces,
            processedWorkspaces,
            failedWorkspaces);
    }
}
