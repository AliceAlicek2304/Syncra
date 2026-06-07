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
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxVolumeResponseDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.GetInboxVolumeAsync(
                fromDate, toDate, resolved.ProfileId, filters.Platform, filters.AccountId, filters.Source, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox volume in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioAnalyticsScopeException ex) { _logger.LogWarning(ex, "Scope missing for inbox volume in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioUnauthorizedException ex) { _logger.LogWarning(ex, "Unauthorized for inbox volume in workspace {WorkspaceId}", workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching inbox volume for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxVolumeResponseDto>("Failed to fetch inbox volume.");
        }
    }

    public async Task<Result<ZernioInboxTopAccountsResponseDto>> GetTopAccountsAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxTopAccountsResponseDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.GetInboxTopAccountsAsync(
                fromDate, toDate, resolved.ProfileId, filters.Platform, filters.Source, filters.Limit, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox top-accounts in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioAnalyticsScopeException ex) { _logger.LogWarning(ex, "Scope missing for inbox top-accounts in workspace {WorkspaceId}", workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching inbox top-accounts for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxTopAccountsResponseDto>("Failed to fetch inbox top accounts.");
        }
    }

    public async Task<Result<ZernioInboxSourceBreakdownResponseDto>> GetSourceBreakdownAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxSourceBreakdownResponseDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.GetInboxSourceBreakdownAsync(
                fromDate, toDate, resolved.ProfileId, filters.Platform, filters.AccountId, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox source-breakdown in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioAnalyticsScopeException ex) { _logger.LogWarning(ex, "Scope missing for inbox source-breakdown in workspace {WorkspaceId}", workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching inbox source-breakdown for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxSourceBreakdownResponseDto>("Failed to fetch inbox source breakdown.");
        }
    }

    public async Task<Result<ZernioInboxResponseTimeResponseDto>> GetResponseTimeAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxResponseTimeResponseDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.GetInboxResponseTimeAsync(
                fromDate, toDate, resolved.ProfileId, filters.Platform, filters.AccountId, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox response-time in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioAnalyticsScopeException ex) { _logger.LogWarning(ex, "Scope missing for inbox response-time in workspace {WorkspaceId}", workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching inbox response-time for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxResponseTimeResponseDto>("Failed to fetch inbox response time.");
        }
    }

    public async Task<Result<ZernioInboxHeatmapResponseDto>> GetHeatmapAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxHeatmapResponseDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.GetInboxHeatmapAsync(
                fromDate, toDate, resolved.ProfileId, filters.Platform, filters.AccountId, filters.Source, filters.Action, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox heatmap in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioAnalyticsScopeException ex) { _logger.LogWarning(ex, "Scope missing for inbox heatmap in workspace {WorkspaceId}", workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching inbox heatmap for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxHeatmapResponseDto>("Failed to fetch inbox heatmap.");
        }
    }

    public async Task<Result<ZernioInboxConversationsListResponseDto>> ListConversationsAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxConversationsListResponseDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.ListInboxConversationsAnalyticsAsync(
                fromDate, toDate, resolved.ProfileId, filters.Platform, filters.AccountId, filters.Source,
                filters.Limit, filters.Page, filters.SortBy, filters.Order, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox conversations list in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioAnalyticsScopeException ex) { _logger.LogWarning(ex, "Scope missing for inbox conversations list in workspace {WorkspaceId}", workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error listing inbox conversations for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxConversationsListResponseDto>("Failed to list inbox conversations.");
        }
    }

    public async Task<Result<ZernioInboxConversationDetailDto>> GetConversationDetailAsync(
        Guid workspaceId,
        string conversationId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default)
    {
        var resolved = await ResolveProfileIdAsync(workspaceId, filters.ProfileId, cancellationToken);
        if (resolved.Error is not null) return Result.Failure<ZernioInboxConversationDetailDto>(resolved.Error);

        var (fromDate, toDate) = ResolveDateRange(filters);

        try
        {
            var response = await _zernioClient.GetInboxConversationAnalyticsAsync(
                conversationId, fromDate, toDate, cancellationToken);
            return Result.Success(response);
        }
        catch (ZernioBillingRequiredException ex) { _logger.LogWarning(ex, "Billing gate for inbox conversation detail in workspace {WorkspaceId}", workspaceId); throw; }
        catch (ZernioNotFoundException ex) { _logger.LogWarning(ex, "Inbox conversation {ConversationId} not found in workspace {WorkspaceId}", conversationId, workspaceId); throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching inbox conversation detail for workspace {WorkspaceId}", workspaceId);
            return Result.Failure<ZernioInboxConversationDetailDto>("Failed to fetch inbox conversation analytics.");
        }
    }

    // ── Private helpers ─────────────────────────────────────────

    private static (DateTime FromDate, DateTime ToDate) ResolveDateRange(InboxAnalyticsFilters filters)
    {
        var toDate = filters.ToDate ?? DateTime.UtcNow.Date;
        var fromDate = filters.FromDate ?? toDate.AddDays(-30);
        if (fromDate > toDate) fromDate = toDate;
        return (fromDate, toDate);
    }

    private async Task<(string? ProfileId, string? Error)> ResolveProfileIdAsync(
        Guid workspaceId,
        string? requestedProfileId,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(requestedProfileId))
            return (requestedProfileId, null);

        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(workspaceId);
        if (profile is null || !profile.IsActive)
        {
            _logger.LogInformation("No active Zernio profile for workspace {WorkspaceId}", workspaceId);
            return (null, "zernio_not_connected");
        }

        return (profile.ZernioProfileId, null);
    }
}
