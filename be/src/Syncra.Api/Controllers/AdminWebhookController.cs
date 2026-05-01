using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/admin/webhooks")]
public class AdminWebhookController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminWebhookController> _logger;

    public AdminWebhookController(AppDbContext db, ILogger<AdminWebhookController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// D-08: List failed webhook records with pagination and filters.
    /// </summary>
    [HttpGet("failed")]
    public async Task<IActionResult> GetFailedWebhooks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? key = null,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.IdempotencyRecords.AsNoTracking()
            .Where(r => r.Status == IdempotencyStatus.Failure || r.Status == IdempotencyStatus.PermanentFailure);

        // Optional status filter
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<IdempotencyStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                query = query.Where(r => r.Status == parsedStatus);
            }
        }

        // Optional key search
        if (!string.IsNullOrWhiteSpace(key))
        {
            query = query.Where(r => r.Key.Contains(key));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var records = await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.Key,
                r.Endpoint,
                Status = r.Status.ToString(),
                r.AttemptCount,
                r.LastError,
                r.ResponseStatusCode,
                r.CreatedAtUtc,
                r.CompletedAtUtc,
                r.ExpiresAtUtc,
                r.WorkspaceId
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Records = records
        });
    }

    /// <summary>
    /// D-09: Reset a failed webhook record so it can be reprocessed.
    /// Resets Status to Pending, AttemptCount to 0, clears LockedUntilUtc and LastError.
    /// Admin then uses Stripe Dashboard to resend the webhook payload.
    /// </summary>
    [HttpPost("{id:guid}/reset")]
    public async Task<IActionResult> ResetWebhook(Guid id, CancellationToken cancellationToken)
    {
        var record = await _db.IdempotencyRecords
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (record == null)
        {
            return NotFound(new { error = $"IdempotencyRecord {id} not found" });
        }

        if (record.Status != IdempotencyStatus.Failure && record.Status != IdempotencyStatus.PermanentFailure)
        {
            return BadRequest(new { error = $"Record is in {record.Status} state — only Failure or PermanentFailure records can be reset" });
        }

        var previousStatus = record.Status.ToString();
        var previousAttemptCount = record.AttemptCount;

        record.Status = IdempotencyStatus.Pending;
        record.AttemptCount = 0;
        record.LockedUntilUtc = null;
        record.LastError = null;
        record.CompletedAtUtc = null;
        record.ResponseStatusCode = null;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Reset webhook record {Id} (Key: {Key}) from {PreviousStatus} (attempts: {PreviousAttempts}) to Pending",
            id, record.Key, previousStatus, previousAttemptCount);

        return Ok(new
        {
            Id = record.Id,
            Key = record.Key,
            Status = record.Status.ToString(),
            Message = $"Reset from {previousStatus} to Pending. Use Stripe Dashboard to resend the event."
        });
    }
}
