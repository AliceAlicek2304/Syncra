using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Syncra.Infrastructure.Persistence;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        Guid workspaceId,
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 100);

        var baseQuery = _db.Notifications
            .AsNoTracking()
            .Where(n => n.WorkspaceId == workspaceId && (!n.UserId.HasValue || n.UserId == userId));

        if (unreadOnly)
        {
            baseQuery = baseQuery.Where(n => n.ReadAtUtc == null);
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        var totalPages = safePageSize > 0 ? (int)Math.Ceiling((double)totalItems / safePageSize) : 0;

        var items = await baseQuery
            .OrderByDescending(n => n.CreatedAtUtc)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Select(n => new
            {
                n.Id,
                n.WorkspaceId,
                n.UserId,
                n.Type,
                n.Title,
                n.Body,
                n.PayloadJson,
                n.CreatedAtUtc,
                n.ReadAtUtc,
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            items,
            pagination = new
            {
                page = safePage,
                pageSize = safePageSize,
                totalItems,
                totalPages,
            }
        });
    }

    [HttpPost("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(
        Guid workspaceId,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();

        var notification = await _db.Notifications.FirstOrDefaultAsync(
            n => n.Id == notificationId &&
                 n.WorkspaceId == workspaceId &&
                 (!n.UserId.HasValue || n.UserId == userId),
            cancellationToken);

        if (notification is null)
        {
            return NotFound();
        }

        notification.ReadAtUtc ??= DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();

        var notifications = await _db.Notifications
            .Where(n => n.WorkspaceId == workspaceId && n.ReadAtUtc == null && (!n.UserId.HasValue || n.UserId == userId))
            .ToListAsync(cancellationToken);

        if (notifications.Count == 0)
        {
            return NoContent();
        }

        var now = DateTimeOffset.UtcNow;
        foreach (var notification in notifications)
        {
            notification.ReadAtUtc = now;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
