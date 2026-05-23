using Syncra.Domain.Common;

namespace Syncra.Application.Interfaces;

/// <summary>
/// Orchestrates the 30-day historical inbox backfill from Zernio list APIs (D-09, D-10).
/// Paginates conversations, comments, and reviews, upserting into local tables.
/// DM thread messages are NOT bulk-fetched during backfill — loaded on thread open (lazy per RESEARCH).
/// </summary>
public interface IInboxBackfillService
{
    Task<Result> BackfillAsync(Guid workspaceId, CancellationToken cancellationToken = default);
}
