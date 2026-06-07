using Syncra.Application.DTOs.Zernio;
using Syncra.Domain.Common;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Interfaces;

public interface IInboxAnalyticsService
{
    Task<Result<ZernioInboxVolumeResponseDto>> GetVolumeAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);

    Task<Result<ZernioInboxTopAccountsResponseDto>> GetTopAccountsAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);

    Task<Result<ZernioInboxSourceBreakdownResponseDto>> GetSourceBreakdownAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);

    Task<Result<ZernioInboxResponseTimeResponseDto>> GetResponseTimeAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);

    Task<Result<ZernioInboxHeatmapResponseDto>> GetHeatmapAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);

    Task<Result<ZernioInboxConversationsListResponseDto>> ListConversationsAsync(
        Guid workspaceId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);

    Task<Result<ZernioInboxConversationDetailDto>> GetConversationDetailAsync(
        Guid workspaceId,
        string conversationId,
        InboxAnalyticsFilters filters,
        CancellationToken cancellationToken = default);
}
