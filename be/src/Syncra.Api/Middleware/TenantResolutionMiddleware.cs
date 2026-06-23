using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Middleware;

/// <summary>
/// Resolves and validates workspace tenant context from the X-Workspace-Id request header.
///
/// Behaviour:
///   - If the header is absent → auto-resolve to the user's first workspace (by WorkspaceMembers).
///   - If the header is present and the authenticated user belongs to that workspace → store the
///     resolved WorkspaceId in HttpContext.Items["WorkspaceId"] and continue.
///   - If the header is present but the user is not a member (or the workspace does not exist) → 403.
///   - If a user is not authenticated → let the default [Authorize] attribute handle the 401.
/// </summary>
public class TenantResolutionMiddleware
{
    private const string WorkspaceHeader = "X-Workspace-Id";
    public const string WorkspaceIdKey = "WorkspaceId";

    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDistributedCache _cache;

    public TenantResolutionMiddleware(
        RequestDelegate next,
        ILogger<TenantResolutionMiddleware> logger,
        IServiceScopeFactory scopeFactory,
        IDistributedCache cache)
    {
        _next = next;
        _logger = logger;
        _scopeFactory = scopeFactory;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip for Auth and User profile routes (login, register, me, etc.)
        if (context.Request.Path.StartsWithSegments("/api/v1/Auth", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/api/v1/Users/me", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/api/v1/admin", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/api/admin", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Extract user identity (only possible after UseAuthentication runs)
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            await _next(context);
            return;
        }

        // If header is present, validate it
        if (context.Request.Headers.TryGetValue(WorkspaceHeader, out var headerValue)
            && !string.IsNullOrWhiteSpace(headerValue))
        {
            // Validate header is a well-formed Guid
            if (!Guid.TryParse(headerValue, out var workspaceId))
            {
                _logger.LogWarning("Received malformed {Header}: {Value}", WorkspaceHeader, (string?)headerValue);
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new
                {
                    statusCode = 400,
                    message = $"Invalid value for {WorkspaceHeader}. Expected a valid GUID."
                });
                return;
            }

            // Validate membership
            if (!await IsMemberOfWorkspace(userId, workspaceId))
            {
                _logger.LogWarning(
                    "User {UserId} attempted to access Workspace {WorkspaceId} without membership.",
                    userId, workspaceId);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new
                {
                    statusCode = 403,
                    message = "You do not have access to this workspace."
                });
                return;
            }

            context.Items[WorkspaceIdKey] = workspaceId;
            _logger.LogDebug("Tenant resolved — User {UserId} → Workspace {WorkspaceId}", userId, workspaceId);
            await _next(context);
            return;
        }

        // No header — auto-resolve to user's first workspace
        var resolvedWorkspaceId = await ResolveDefaultWorkspaceId(userId);
        if (resolvedWorkspaceId.HasValue)
        {
            context.Items[WorkspaceIdKey] = resolvedWorkspaceId.Value;
            _logger.LogDebug("Tenant auto-resolved — User {UserId} → Workspace {WorkspaceId} (default)", userId, resolvedWorkspaceId.Value);
        }

        await _next(context);
    }

    private async Task<bool> IsMemberOfWorkspace(Guid userId, Guid workspaceId)
    {
        var cacheKey = $"tenant_cache:{userId}:{workspaceId}";
        var cachedMembership = await _cache.GetStringAsync(cacheKey);

        if (cachedMembership != null)
            return bool.Parse(cachedMembership);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var isMember = await db.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId);

        await _cache.SetStringAsync(cacheKey, isMember.ToString(), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        });

        return isMember;
    }

    private async Task<Guid?> ResolveDefaultWorkspaceId(Guid userId)
    {
        var cacheKey = $"tenant_default_ws:{userId}";
        var cachedId = await _cache.GetStringAsync(cacheKey);

        if (Guid.TryParse(cachedId, out var cached))
            return cached;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var workspaceId = await db.WorkspaceMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.WorkspaceId)
            .FirstOrDefaultAsync();

        if (workspaceId != Guid.Empty)
        {
            await _cache.SetStringAsync(cacheKey, workspaceId.ToString(), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });
        }

        return workspaceId == Guid.Empty ? null : workspaceId;
    }
}
