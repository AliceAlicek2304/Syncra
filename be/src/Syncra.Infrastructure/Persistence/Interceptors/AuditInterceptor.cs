using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Infrastructure.Persistence.Interceptors;

/// <summary>
/// EF Core SaveChanges interceptor that writes an AuditLog row for every
/// entity added, modified, or deleted during a unit-of-work save.
/// </summary>
public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not AppDbContext db)
            return await base.SavingChangesAsync(eventData, result, cancellationToken);

        var auditEntries = BuildAuditEntries(db);

        if (auditEntries.Count > 0)
            db.AuditLogs.AddRange(auditEntries);

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private List<AuditLog> BuildAuditEntries(AppDbContext db)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        // Resolve caller identity from the HTTP context when available
        Guid? userId = null;
        Guid? workspaceId = null;
        string? ipAddress = null;
        string? userAgent = null;
        string? correlationId = null;

        if (httpContext is not null)
        {
            var userIdClaim = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                userId = parsedUserId;

            if (httpContext.Items.TryGetValue("WorkspaceId", out var wsIdObj) && wsIdObj is Guid wsId)
                workspaceId = wsId;

            ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
            userAgent = httpContext.Request.Headers["User-Agent"].FirstOrDefault();
            correlationId = httpContext.TraceIdentifier;
        }

        var logs = new List<AuditLog>();

        foreach (var entry in db.ChangeTracker.Entries())
        {
            // Skip AuditLog itself to avoid recursive loops
            if (entry.Entity is AuditLog)
                continue;

            // Only interested in meaningful state transitions
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            var action = entry.State switch
            {
                EntityState.Added => "Created",
                EntityState.Modified => "Updated",
                EntityState.Deleted => "Deleted",
                _ => "Unknown"
            };

            // Capture a change snapshot (new values for Add/Modify, primary key for Delete)
            Dictionary<string, object?> details;
            if (entry.State == EntityState.Deleted)
            {
                details = entry.Properties
                    .Where(p => p.Metadata.IsPrimaryKey())
                    .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue);
            }
            else
            {
                var modifiedProps = entry.State == EntityState.Modified
                    ? entry.Properties.Where(p => p.IsModified)
                    : entry.Properties;

                details = modifiedProps.ToDictionary(
                    p => p.Metadata.Name,
                    p => p.CurrentValue);
            }

            // Try to get the entity's primary key value as a string
            var entityId = string.Empty;
            var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            if (pkProp?.CurrentValue != null)
                entityId = pkProp.CurrentValue.ToString() ?? string.Empty;

            logs.Add(new AuditLog
            {
                WorkspaceId = workspaceId,
                UserId = userId,
                ActorType = userId.HasValue ? AuditActorType.User : AuditActorType.System,
                Action = action,
                EntityType = entry.Entity.GetType().Name,
                EntityId = entityId,
                Result = AuditResult.Success,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CorrelationId = correlationId,
                DetailsJson = details.Count > 0 ? JsonSerializer.Serialize(details) : null
            });
        }

        return logs;
    }
}
