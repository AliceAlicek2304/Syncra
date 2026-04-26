using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Middleware;

/// <summary>
/// Resolves and validates workspace tenant context from the X-Workspace-Id request header.
///
/// Behaviour:
///   - If the header is absent → pass through (routes not requiring a workspace context can proceed).
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
        // Only attempt resolution when the header is present
        if (!context.Request.Headers.TryGetValue(WorkspaceHeader, out var headerValue)
            || string.IsNullOrWhiteSpace(headerValue))
        {
            // No workspace context — let the request fall through
            await _next(context);
            return;
        }

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

        // Extract user identity (only possible after UseAuthentication runs)
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            // User not authenticated — pass through; [Authorize] will reject them
            await _next(context);
            return;
        }

        // Try to get from cache
        var cacheKey = $"tenant_cache:{userId}:{workspaceId}";
        var cachedMembership = await _cache.GetStringAsync(cacheKey);

        bool isMember;
        if (cachedMembership != null)
        {
            isMember = bool.Parse(cachedMembership);
        }
        else
        {
            // Validate membership using a scoped DB context
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            isMember = await db.WorkspaceMembers
                .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId);

            // Cache the result for 1 hour
            await _cache.SetStringAsync(cacheKey, isMember.ToString(), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });
        }

        if (!isMember)
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

        // Publish the validated workspace ID for downstream controllers
        context.Items[WorkspaceIdKey] = workspaceId;

        _logger.LogDebug("Tenant resolved — User {UserId} → Workspace {WorkspaceId}", userId, workspaceId);

        await _next(context);
    }
}
