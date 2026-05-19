using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace Syncra.Api.Logging;

/// <summary>
/// Middleware that pushes the authenticated user's UserId into Serilog's LogContext
/// for the duration of the HTTP request. Reads from ClaimTypes.NameIdentifier with
/// fallback to "sub" claim. Safe for unauthenticated requests — no UserId is pushed
/// if the user is anonymous.
/// </summary>
public sealed class UserIdEnricher
{
    private readonly RequestDelegate _next;

    public UserIdEnricher(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        var userId = GetUserId(context.User);

        if (!string.IsNullOrEmpty(userId))
        {
            using (LogContext.PushProperty("UserId", userId))
            {
                await _next(context);
            }
        }
        else
        {
            await _next(context);
        }
    }

    private static string? GetUserId(ClaimsPrincipal user)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return null;

        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");
    }
}
