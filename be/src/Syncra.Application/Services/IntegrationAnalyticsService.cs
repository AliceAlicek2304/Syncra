using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;
using System.Text.Json;

namespace Syncra.Application.Services;

/// <summary>
/// Matches Potiz IntegrationService.checkAnalytics() and PostsService.checkPostAnalytics().
/// Handles Redis cache, token refresh retry, and provider delegation.
/// </summary>
public sealed class IntegrationAnalyticsService : IIntegrationAnalyticsService
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IPostRepository _postRepository;
    private readonly IAnalyticsAdapterRegistry _analyticsRegistry;
    private readonly IIntegrationTokenRefreshService _tokenRefreshService;
    private readonly IAnalyticsCache _cache;
    private readonly ILogger<IntegrationAnalyticsService> _logger;

    // Dev: 1s TTL, Prod: 1h TTL — matches Potiz integration.service.ts:388
    private static readonly TimeSpan CacheTtl = string.Equals(
        Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development",
        StringComparison.OrdinalIgnoreCase)
        ? TimeSpan.FromSeconds(1)
        : TimeSpan.FromHours(1);

    public IntegrationAnalyticsService(
        IIntegrationRepository integrationRepository,
        IPostRepository postRepository,
        IAnalyticsAdapterRegistry analyticsRegistry,
        IIntegrationTokenRefreshService tokenRefreshService,
        IAnalyticsCache cache,
        ILogger<IntegrationAnalyticsService> logger)
    {
        _integrationRepository = integrationRepository;
        _postRepository = postRepository;
        _analyticsRegistry = analyticsRegistry;
        _tokenRefreshService = tokenRefreshService;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Matches Potiz integration.service.ts:329 checkAnalytics().
    /// Cache key: integration:{workspaceId}:{integrationId}:{date}
    /// </summary>
    public async Task<List<AnalyticsData>> CheckAnalyticsAsync(
        Guid workspaceId,
        Guid integrationId,
        int date,
        CancellationToken cancellationToken = default)
    {
        var integration = await _integrationRepository.GetByIdAsync(integrationId);
        if (integration == null || integration.WorkspaceId != workspaceId)
            return new List<AnalyticsData>();

        var adapter = _analyticsRegistry.GetAdapterOrDefault(integration.Platform);
        if (adapter == null)
            return new List<AnalyticsData>();

        // Token refresh if expired — matches Potiz integration.service.ts:374
        var accessToken = integration.AccessToken!;
        if (integration.ExpiresAtUtc.HasValue && integration.ExpiresAtUtc.Value <= DateTime.UtcNow)
        {
            var refreshed = await _tokenRefreshService.RefreshExpiringIntegrationsAsync(cancellationToken);
            if (refreshed.Failed > 0)
                return new List<AnalyticsData>();

            integration = await _integrationRepository.GetByIdAsync(integrationId);
            if (integration?.AccessToken == null)
                return new List<AnalyticsData>();

            accessToken = integration.AccessToken;
        }

        // Redis cache read — matches Potiz integration.service.ts:374
        var cacheKey = $"integration:{workspaceId}:{integrationId}:{date}";
        var cached = await _cache.GetAsync(cacheKey, cancellationToken);
        if (cached != null)
            return JsonSerializer.Deserialize<List<AnalyticsData>>(cached) ?? new();

        try
        {
            // Matches Potiz integration.service.ts:383 — call provider analytics
            // Pass integration.Metadata as id so adapter can extract pageId + pageAccessToken
            var result = await adapter.GetAnalyticsAsync(
                integration.Metadata ?? string.Empty,
                accessToken,
                date,
                cancellationToken);

            // Redis cache write — matches Potiz integration.service.ts:388
            await _cache.SetAsync(cacheKey, JsonSerializer.Serialize(result), CacheTtl, cancellationToken);
            return result;
        }
        catch (RefreshTokenException)
        {
            // Matches Potiz integration.service.ts:398 — retry after refresh
            _logger.LogInformation("RefreshToken error for integration {Id}, retrying after refresh.", integrationId);
            await _tokenRefreshService.RefreshExpiringIntegrationsAsync(cancellationToken);

            integration = await _integrationRepository.GetByIdAsync(integrationId);
            if (integration?.AccessToken == null)
                return new List<AnalyticsData>();

            try
            {
                return await adapter.GetAnalyticsAsync(
                    integration.Metadata ?? string.Empty,
                    integration.AccessToken,
                    date,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Analytics retry failed for integration {Id}.", integrationId);
                return new List<AnalyticsData>();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching analytics for integration {Id}.", integrationId);
            return new List<AnalyticsData>();
        }
    }

    /// <summary>
    /// Matches Potiz posts.service.ts:132 checkPostAnalytics().
    /// Cache key: integration:{workspaceId}:{postId}:{date}
    /// </summary>
    public async Task<List<AnalyticsData>> CheckPostAnalyticsAsync(
        Guid workspaceId,
        Guid postId,
        int date,
        CancellationToken cancellationToken = default)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null || post.WorkspaceId != workspaceId)
        {
            _logger.LogWarning("[PostAnalytics] Post {PostId} not found or workspace mismatch (expected {WorkspaceId}, got {ActualWorkspaceId})",
                postId, workspaceId, post?.WorkspaceId);
            return new List<AnalyticsData>();
        }

        _logger.LogInformation("[PostAnalytics] Post {PostId} status={Status} PublishExternalId={ExternalId} IntegrationId={IntegrationId}",
            postId, post.Status, post.PublishExternalId ?? "(null)", post.IntegrationId?.ToString() ?? "(null)");

        // No external ID yet — post not published (Potiz: releaseId missing check)
        if (string.IsNullOrEmpty(post.PublishExternalId))
        {
            _logger.LogWarning("[PostAnalytics] Post {PostId} has no PublishExternalId — not yet published.", postId);
            return new List<AnalyticsData>();
        }

        var integration = post.Integration;
        if (integration == null)
        {
            _logger.LogWarning("[PostAnalytics] Post {PostId} has no Integration loaded.", postId);
            return new List<AnalyticsData>();
        }

        // If integration metadata is missing pageAccessToken, try to find the active integration
        // for this workspace+platform — handles case where post was linked to an old integration
        if (!string.IsNullOrEmpty(integration.Metadata))
        {
            try
            {
                var meta = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(integration.Metadata);
                if (string.IsNullOrEmpty(meta?.GetValueOrDefault("pageAccessToken")))
                {
                    _logger.LogWarning("[PostAnalytics] Integration {IntId} has no pageAccessToken in metadata, looking for active integration.", integration.Id);
                    var activeIntegration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(workspaceId, integration.Platform);
                    if (activeIntegration != null && !string.IsNullOrEmpty(activeIntegration.Metadata))
                    {
                        var activeMeta = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(activeIntegration.Metadata);
                        if (!string.IsNullOrEmpty(activeMeta?.GetValueOrDefault("pageAccessToken")))
                        {
                            _logger.LogInformation("[PostAnalytics] Using active integration {IntId} with pageAccessToken.", activeIntegration.Id);
                            integration = activeIntegration;
                        }
                    }
                }
            }
            catch { /* ignore parse errors */ }
        }
        else
        {
            // No metadata at all — try active integration
            var activeIntegration = await _integrationRepository.GetByWorkspaceAndPlatformAsync(workspaceId, integration.Platform);
            if (activeIntegration != null) integration = activeIntegration;
        }

        _logger.LogInformation("[PostAnalytics] Integration platform={Platform} ExternalAccountId={AccountId} HasToken={HasToken} ExpiresAt={ExpiresAt}",
            integration.Platform, integration.ExternalAccountId ?? "(null)",
            !string.IsNullOrEmpty(integration.AccessToken), integration.ExpiresAtUtc?.ToString("o") ?? "(null)");

        var adapter = _analyticsRegistry.GetAdapterOrDefault(integration.Platform);
        if (adapter == null)
        {
            _logger.LogWarning("[PostAnalytics] No analytics adapter registered for platform '{Platform}'.", integration.Platform);
            return new List<AnalyticsData>();
        }

        var accessToken = integration.AccessToken!;

        // Token refresh if expired
        if (integration.ExpiresAtUtc.HasValue && integration.ExpiresAtUtc.Value <= DateTime.UtcNow)
        {
            var refreshed = await _tokenRefreshService.RefreshExpiringIntegrationsAsync(cancellationToken);
            if (refreshed.Failed > 0)
                return new List<AnalyticsData>();

            integration = await _integrationRepository.GetByIdAsync(integration.Id);
            if (integration?.AccessToken == null)
                return new List<AnalyticsData>();

            accessToken = integration.AccessToken;
        }

        // Redis cache read
        var cacheKey = $"integration:{workspaceId}:{postId}:{date}";
        var cached = await _cache.GetAsync(cacheKey, cancellationToken);
        if (cached != null)
            return JsonSerializer.Deserialize<List<AnalyticsData>>(cached) ?? new();

        try
        {
            var result = await adapter.GetPostAnalyticsAsync(
                integration.Metadata ?? string.Empty,
                accessToken,
                post.PublishExternalId,
                date,
                cancellationToken);

            await _cache.SetAsync(cacheKey, JsonSerializer.Serialize(result), CacheTtl, cancellationToken);
            return result;
        }
        catch (RefreshTokenException)
        {
            // Retry after refresh — matches Potiz posts.service.ts pattern
            _logger.LogInformation("RefreshToken error for post {Id}, retrying after refresh.", postId);
            await _tokenRefreshService.RefreshExpiringIntegrationsAsync(cancellationToken);

            integration = await _integrationRepository.GetByIdAsync(integration.Id);
            if (integration?.AccessToken == null)
                return new List<AnalyticsData>();

            try
            {
                return await adapter.GetPostAnalyticsAsync(
                    integration.Metadata ?? string.Empty,
                    integration.AccessToken,
                    post.PublishExternalId,
                    date,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Post analytics retry failed for post {Id}.", postId);
                return new List<AnalyticsData>();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching post analytics for post {Id}.", postId);
            return new List<AnalyticsData>();
        }
    }
}
