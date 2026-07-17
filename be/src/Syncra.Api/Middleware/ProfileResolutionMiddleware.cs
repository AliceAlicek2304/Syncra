using Microsoft.EntityFrameworkCore;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Middleware;

/// <summary>
/// Resolves and validates profile context from the X-Profile-Id request header.
/// Ensures the profile exists and belongs to the workspace resolved by TenantResolutionMiddleware.
/// </summary>
public class ProfileResolutionMiddleware
{
    private const string ProfileHeader = "X-Profile-Id";
    public const string ProfileIdKey = "ProfileId";

    private readonly RequestDelegate _next;
    private readonly ILogger<ProfileResolutionMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ProfileResolutionMiddleware(
        RequestDelegate next,
        ILogger<ProfileResolutionMiddleware> logger,
        IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Skip validation for Auth, User profile, and Workspace list routes
        if (context.Request.Path.StartsWithSegments("/api/v1/Auth", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/api/v1/Users/me", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/api/v1/admin", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/api/admin", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(context.Request.Path.Value?.TrimEnd('/'), "/api/v1/workspaces", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // 2. Check if X-Profile-Id header is present
        if (!context.Request.Headers.TryGetValue(ProfileHeader, out var headerValue)
            || string.IsNullOrWhiteSpace(headerValue))
        {
            await _next(context);
            return;
        }

        // 3. Parse ProfileId
        if (!Guid.TryParse(headerValue, out var profileId))
        {
            _logger.LogWarning("Invalid X-Profile-Id format: {HeaderValue}", headerValue.ToString());
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { code = "invalid_profile_id", message = "X-Profile-Id must be a valid GUID." });
            return;
        }

        // 4. Get WorkspaceId from HttpContext (set by TenantResolutionMiddleware)
        var workspaceId = context.Items[TenantResolutionMiddleware.WorkspaceIdKey] as Guid?;
        if (workspaceId == null)
        {
            // If Profile ID is sent without Workspace ID, it might be a login request or old client state.
            // We just let it pass without setting the ProfileId context item.
            await _next(context);
            return;
        }

        // 5. Validate profile ownership
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var profile = await db.ZernioProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == profileId && p.WorkspaceId == workspaceId.Value && p.IsActive);

        if (profile == null)
        {
            _logger.LogWarning("Profile {ProfileId} not found or does not belong to Workspace {WorkspaceId}", profileId, workspaceId);
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new { code = "forbidden_profile", message = "Profile not found or access denied." });
            return;
        }

        // 6. Store in context items
        context.Items[ProfileIdKey] = profileId;
        
        await _next(context);
    }
}
