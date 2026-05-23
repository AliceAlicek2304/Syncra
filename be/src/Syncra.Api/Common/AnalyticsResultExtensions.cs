using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Common;

namespace Syncra.Api.Common;

/// <summary>
/// Extension methods for analytics controller actions that need
/// non-400 HTTP status codes (202, 402, 412) — bypasses the generic
/// ResultExtensions.ToActionResult() which always returns 400 on failure.
/// </summary>
public static class AnalyticsResultExtensions
{
    /// <summary>
    /// Maps a Result&lt;PostMetricsDto&gt; to the correct IActionResult:
    /// - Sync-pending → 202 Accepted with body
    /// - Success → 200 OK
    /// - Failure → 400 BadRequest
    /// </summary>
    public static IActionResult ToAnalyticsActionResult(this Result<PostMetricsDto> result)
    {
        if (result.IsFailure)
            return new BadRequestObjectResult(new { error = result.Error });

        if (result.Value.IsSyncPending)
        {
            return new AcceptedResult((string?)null, new
            {
                status = "syncing",
                message = "Post metrics are still being collected from platforms."
            });
        }

        return new OkObjectResult(result.Value);
    }

    /// <summary>
    /// Maps a Result&lt;T&gt; to the correct IActionResult for analytics endpoints.
    /// Success → 200 OK, Failure → 400 BadRequest (no special status codes).
    /// </summary>
    public static IActionResult ToAnalyticsActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
            return new OkObjectResult(result.Value);

        return new BadRequestObjectResult(new { error = result.Error });
    }

    /// <summary>
    /// Maps a Result (void) to the correct IActionResult.
    /// Success → 204 NoContent, Failure → 400 BadRequest.
    /// </summary>
    public static IActionResult ToAnalyticsActionResult(this Result result)
    {
        if (result.IsSuccess)
            return new NoContentResult();

        return new BadRequestObjectResult(new { error = result.Error });
    }
}
