using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Services;

public sealed class InboxAnalyticsService : IInboxAnalyticsService
{
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ILogger<InboxAnalyticsService> _logger;

    public InboxAnalyticsService(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        ILogger<InboxAnalyticsService> logger)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _logger = logger;
    }

    public async Task<Result<ZernioInboxVolumeResponseDto>> GetVolumeAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxVolumeResponseDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.GetInboxVolumeAsync(fromDate, toDate, pid, filters.Platform, filters.AccountId, filters.Source, cancellationToken),
                pid, "inbox volume"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxVolumeResponseDto>("Failed to fetch inbox volume.");
            }

            return Result.Success(AggregateVolume(successful));
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioAnalyticsScopeException) { throw; }
    }

    public async Task<Result<ZernioInboxTopAccountsResponseDto>> GetTopAccountsAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxTopAccountsResponseDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.GetInboxTopAccountsAsync(fromDate, toDate, pid, filters.Platform, filters.Source, filters.Limit, cancellationToken),
                pid, "inbox top-accounts"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxTopAccountsResponseDto>("Failed to fetch inbox top accounts.");
            }

            return Result.Success(AggregateTopAccounts(successful));
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioAnalyticsScopeException) { throw; }
    }

    public async Task<Result<ZernioInboxSourceBreakdownResponseDto>> GetSourceBreakdownAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxSourceBreakdownResponseDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.GetInboxSourceBreakdownAsync(fromDate, toDate, pid, filters.Platform, filters.AccountId, cancellationToken),
                pid, "inbox source-breakdown"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxSourceBreakdownResponseDto>("Failed to fetch inbox source breakdown.");
            }

            return Result.Success(AggregateSourceBreakdown(successful));
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioAnalyticsScopeException) { throw; }
    }

    public async Task<Result<ZernioInboxResponseTimeResponseDto>> GetResponseTimeAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxResponseTimeResponseDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.GetInboxResponseTimeAsync(fromDate, toDate, pid, filters.Platform, filters.AccountId, cancellationToken),
                pid, "inbox response-time"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxResponseTimeResponseDto>("Failed to fetch inbox response time.");
            }

            return Result.Success(AggregateResponseTime(successful));
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioAnalyticsScopeException) { throw; }
    }

    public async Task<Result<ZernioInboxHeatmapResponseDto>> GetHeatmapAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxHeatmapResponseDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.GetInboxHeatmapAsync(fromDate, toDate, pid, filters.Platform, filters.AccountId, filters.Source, filters.Action, cancellationToken),
                pid, "inbox heatmap"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxHeatmapResponseDto>("Failed to fetch inbox heatmap.");
            }

            return Result.Success(AggregateHeatmap(successful));
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioAnalyticsScopeException) { throw; }
    }

    public async Task<Result<ZernioInboxConversationsListResponseDto>> ListConversationsAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxConversationsListResponseDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            // For multi-profile, fetch enough data from each profile then sort + paginate in-memory
            int? fetchLimit;
            int? fetchPage;
            if (profileIds.Count > 1 && filters.Limit.HasValue && filters.Page.HasValue)
            {
                fetchLimit = filters.Limit.Value * filters.Page.Value;
                fetchPage = 1;
            }
            else
            {
                fetchLimit = filters.Limit;
                fetchPage = filters.Page;
            }

            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.ListInboxConversationsAnalyticsAsync(fromDate, toDate, pid, filters.Platform, filters.AccountId, filters.Source,
                    fetchLimit, fetchPage, filters.SortBy, filters.Order, cancellationToken),
                pid, "inbox conversations list"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxConversationsListResponseDto>("Failed to list inbox conversations.");
            }

            return Result.Success(AggregateConversationsList(successful, filters.SortBy, filters.Order, filters.Page, filters.Limit));
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioAnalyticsScopeException) { throw; }
    }

    public async Task<Result<ZernioInboxConversationDetailDto>> GetConversationDetailAsync(
        Guid workspaceId,
        string conversationId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var profileIds = await ResolveProfileIdsAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (profileIds.Count == 0)
            return Result.Failure<ZernioInboxConversationDetailDto>("zernio_not_connected");

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var tasks = profileIds.Select(pid => SafeFetchAsync(
                () => _zernioClient.GetInboxConversationAnalyticsAsync(conversationId, fromDate, toDate, cancellationToken),
                pid, "inbox conversation detail"));
            var results = await Task.WhenAll(tasks);
            var successful = results.Where(r => r.Value is not null).Select(r => r.Value!).ToList();

            if (successful.Count == 0)
            {
                var billingError = results.Select(r => r.BillingError).FirstOrDefault(e => e is not null);
                if (billingError != null) throw billingError;
                var scopeError = results.Select(r => r.ScopeError).FirstOrDefault(e => e is not null);
                if (scopeError != null) throw scopeError;
                var unexpectedError = results.Select(r => r.UnexpectedError).FirstOrDefault(e => e is not null);
                if (unexpectedError != null) throw unexpectedError;
                return Result.Failure<ZernioInboxConversationDetailDto>("Failed to fetch inbox conversation analytics.");
            }

            return Result.Success(successful[0]);
        }
        catch (ZernioBillingRequiredException) { throw; }
        catch (ZernioNotFoundException) { throw; }
    }

    // ── Private helpers ─────────────────────────────────────────

    private static (DateTime FromDate, DateTime ToDate) ResolveDateRange(InboxAnalyticsFilters filters)
    {
        var toDate = filters.ToDate ?? DateTime.UtcNow.Date;
        var fromDate = filters.FromDate ?? toDate.AddDays(-30);
        if (fromDate > toDate) fromDate = toDate;
        return (fromDate, toDate);
    }

    private async Task<IReadOnlyList<string>> ResolveProfileIdsAsync(
        Guid workspaceId,
        string? requestedProfileId,
        CancellationToken cancellationToken)
    {
        var profiles = await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(workspaceId);
        if (profiles.Count == 0)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return Array.Empty<string>();
        }

        var validProfileIds = profiles.Select(p => p.ZernioProfileId).ToHashSet();

        // Specific profile requested (not "all" and not empty)
        if (!string.IsNullOrEmpty(requestedProfileId) && !string.Equals(requestedProfileId, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (validProfileIds.Contains(requestedProfileId))
                return new[] { requestedProfileId };

            // Check if it's the database profile GUID
            if (Guid.TryParse(requestedProfileId, out var profileGuid))
            {
                var profile = profiles.FirstOrDefault(p => p.Id == profileGuid);
                if (profile is not null)
                    return new[] { profile.ZernioProfileId };
            }

            _logger.LogWarning(
                "Requested profileId {ProfileId} does not belong to workspace {WorkspaceId}",
                requestedProfileId, workspaceId);
            return Array.Empty<string>();
        }

        return profiles.Select(p => p.ZernioProfileId).ToList();
    }

    private sealed record SafeFetchResult<T>(T? Value, ZernioBillingRequiredException? BillingError, ZernioAnalyticsScopeException? ScopeError, Exception? UnexpectedError);

    private async Task<SafeFetchResult<T>> SafeFetchAsync<T>(Func<Task<T>> fetchFn, string profileId, string label)
    {
        try
        {
            var result = await fetchFn();
            return new SafeFetchResult<T>(result, null, null, null);
        }
        catch (ZernioBillingRequiredException ex)
        {
            _logger.LogWarning(ex, "Billing gate for {Label} on profile {ProfileId}", label, profileId);
            return new SafeFetchResult<T>(default, ex, null, null);
        }
        catch (ZernioAnalyticsScopeException ex)
        {
            _logger.LogWarning(ex, "Scope missing for {Label} on profile {ProfileId}", label, profileId);
            return new SafeFetchResult<T>(default, null, ex, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch {Label} for profile {ProfileId}", label, profileId);
            return new SafeFetchResult<T>(default, null, null, ex);
        }
    }

    private static ZernioInboxVolumeResponseDto AggregateVolume(
        IReadOnlyList<ZernioInboxVolumeResponseDto> volumes)
    {
        if (volumes.Count == 1) return volumes[0];

        var first = volumes[0];
        var summary = new ZernioInboxVolumeSummaryDto(
            Received: volumes.Sum(v => v.Summary.Received),
            Sent: volumes.Sum(v => v.Summary.Sent),
            Read: volumes.Sum(v => v.Summary.Read),
            Failed: volumes.Sum(v => v.Summary.Failed),
            UniqueConversations: volumes.Sum(v => v.Summary.UniqueConversations));

        var timeseries = volumes
            .SelectMany(v => v.Timeseries)
            .GroupBy(t => t.Date)
            .Select(g => new ZernioInboxDailyTotalsDto(
                Date: g.Key,
                Sent: g.Sum(t => t.Sent),
                Received: g.Sum(t => t.Received),
                Read: g.Sum(t => t.Read),
                Failed: g.Sum(t => t.Failed)))
            .OrderBy(t => t.Date)
            .ToList();

        var byPlatform = volumes
            .SelectMany(v => v.ByPlatform)
            .GroupBy(p => p.Platform)
            .Select(g => new ZernioInboxPlatformBreakdownDto(
                Platform: g.Key,
                Sent: g.Sum(p => p.Sent),
                Received: g.Sum(p => p.Received),
                Read: g.Sum(p => p.Read),
                Failed: g.Sum(p => p.Failed)))
            .ToList();

        return new ZernioInboxVolumeResponseDto(
            first.Success, first.From, first.To, summary, timeseries, byPlatform);
    }

    private static ZernioInboxTopAccountsResponseDto AggregateTopAccounts(
        IReadOnlyList<ZernioInboxTopAccountsResponseDto> accounts)
    {
        if (accounts.Count == 1) return accounts[0];

        var first = accounts[0];
        var merged = accounts
            .SelectMany(a => a.Accounts)
            .GroupBy(a => a.AccountId)
            .Select(g =>
            {
                var a = g.First();
                return new ZernioInboxTopAccountDto(
                    a.AccountId, a.Platform, a.DisplayName, a.Username,
                    Received: g.Sum(x => x.Received),
                    Sent: g.Sum(x => x.Sent),
                    Total: g.Sum(x => x.Total),
                    Conversations: g.Sum(x => x.Conversations),
                    MedianResponseSeconds: g.Average(x => x.MedianResponseSeconds),
                    RepliedCount: g.Sum(x => x.RepliedCount));
            })
            .OrderByDescending(a => a.Total)
            .ToList();

        return new ZernioInboxTopAccountsResponseDto(first.Success, first.From, first.To, merged);
    }

    private static ZernioInboxSourceBreakdownResponseDto AggregateSourceBreakdown(
        IReadOnlyList<ZernioInboxSourceBreakdownResponseDto> sources)
    {
        if (sources.Count == 1) return sources[0];

        var first = sources[0];
        var merged = sources
            .SelectMany(s => s.Sources)
            .GroupBy(s => s.Source)
            .Select(g => new ZernioInboxSourceBreakdownRowDto(
                Source: g.Key,
                Received: g.Sum(x => x.Received),
                Sent: g.Sum(x => x.Sent),
                Read: g.Sum(x => x.Read),
                ByPlatform: g
                    .SelectMany(x => x.ByPlatform)
                    .GroupBy(p => p.Platform)
                    .Select(pg => new ZernioInboxSourcePlatformDto(
                        Platform: pg.Key,
                        Received: pg.Sum(x => x.Received),
                        Sent: pg.Sum(x => x.Sent),
                        Read: pg.Sum(x => x.Read)))
                    .ToList()))
            .ToList();

        return new ZernioInboxSourceBreakdownResponseDto(first.Success, first.From, first.To, merged);
    }

    private static ZernioInboxResponseTimeResponseDto AggregateResponseTime(
        IReadOnlyList<ZernioInboxResponseTimeResponseDto> responses)
    {
        if (responses.Count == 1) return responses[0];

        var first = responses[0];
        var totalSampleSize = responses.Sum(r => r.Summary.SampleSize);

        if (totalSampleSize == 0)
            return first;

        var summary = new ZernioInboxResponseTimeSummaryDto(
            SampleSize: totalSampleSize,
            MedianSeconds: responses.Sum(r => r.Summary.MedianSeconds * r.Summary.SampleSize) / totalSampleSize,
            P90Seconds: responses.Sum(r => r.Summary.P90Seconds * r.Summary.SampleSize) / totalSampleSize,
            P99Seconds: responses.Sum(r => r.Summary.P99Seconds * r.Summary.SampleSize) / totalSampleSize,
            MeanSeconds: responses.Sum(r => r.Summary.MeanSeconds * r.Summary.SampleSize) / totalSampleSize,
            FastestSeconds: responses.Min(r => r.Summary.FastestSeconds),
            SlowestSeconds: responses.Max(r => r.Summary.SlowestSeconds));

        var histogram = responses
            .SelectMany(r => r.Histogram)
            .GroupBy(h => h.Bucket)
            .Select(g => new ZernioInboxResponseHistogramBucketDto(
                Bucket: g.Key,
                LowerSeconds: g.First().LowerSeconds,
                UpperSeconds: g.First().UpperSeconds,
                Count: g.Sum(h => h.Count)))
            .OrderBy(h => h.LowerSeconds)
            .ToList();

        return new ZernioInboxResponseTimeResponseDto(first.Success, first.From, first.To, summary, histogram);
    }

    private static ZernioInboxHeatmapResponseDto AggregateHeatmap(
        IReadOnlyList<ZernioInboxHeatmapResponseDto> heatmaps)
    {
        if (heatmaps.Count == 1) return heatmaps[0];

        var first = heatmaps[0];
        var buckets = heatmaps
            .SelectMany(h => h.Buckets)
            .GroupBy(b => (b.Dow, b.Hour))
            .Select(g => new ZernioInboxHeatmapBucketDto(
                Dow: g.Key.Dow,
                Hour: g.Key.Hour,
                Received: g.Sum(b => b.Received),
                Sent: g.Sum(b => b.Sent),
                Read: g.Sum(b => b.Read)))
            .OrderBy(b => b.Dow).ThenBy(b => b.Hour)
            .ToList();

        return new ZernioInboxHeatmapResponseDto(first.Success, first.From, first.To, buckets);
    }

    private static ZernioInboxConversationsListResponseDto AggregateConversationsList(
        IReadOnlyList<ZernioInboxConversationsListResponseDto> lists,
        string? sortBy = null,
        string? order = null,
        int? page = null,
        int? limit = null)
    {
        if (lists.Count == 1) return lists[0];

        var first = lists[0];
        var allItems = lists.SelectMany(l => l.Items).ToList();
        var totalCount = allItems.Count;

        var sorted = SortConversations(allItems, sortBy, order);
        var descending = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);

        var resolvedPage = page ?? 1;
        var resolvedLimit = limit ?? totalCount;
        var skip = (resolvedPage - 1) * resolvedLimit;
        var pagedItems = sorted.Skip(skip).Take(resolvedLimit).ToList();

        var pagination = new ZernioInboxPaginationDto(
            Page: resolvedPage,
            Limit: resolvedLimit,
            Total: totalCount,
            TotalPages: (int)Math.Ceiling((double)totalCount / resolvedLimit),
            HasMore: resolvedPage * resolvedLimit < totalCount);

        return new ZernioInboxConversationsListResponseDto(
            first.Success, first.From, first.To, pagedItems, pagination);
    }

    private static List<ZernioInboxConversationListItemDto> SortConversations(
        List<ZernioInboxConversationListItemDto> items,
        string? sortBy,
        string? order)
    {
        var descending = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);

        var sorted = (sortBy?.ToLowerInvariant()) switch
        {
            "lastmessagedat" => items.OrderBy(i => i.LastMessagedAt),
            "firstmessagedat" => items.OrderBy(i => i.FirstMessagedAt),
            "totalmessages" => items.OrderBy(i => i.TotalMessages),
            "received" => items.OrderBy(i => i.Received),
            "sent" => items.OrderBy(i => i.Sent),
            _ => items.OrderBy(i => i.LastMessagedAt)
        };

        return descending ? sorted.Reverse().ToList() : sorted.ToList();
    }
}
