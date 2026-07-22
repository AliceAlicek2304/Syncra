using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.Services;

public sealed class ActivityEventService : IActivityEventService
{
    private static readonly TimeSpan RetentionPeriod = TimeSpan.FromDays(7);

    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ActivityEventService> _logger;

    public ActivityEventService(
        AppDbContext db,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ActivityEventService> logger)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task RecordAsync(ActivityEventRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var now = DateTime.UtcNow;
            var httpContext = _httpContextAccessor.HttpContext;
            var metadata = request.Metadata == null
                ? null
                : JsonSerializer.Serialize(request.Metadata.Where(item => !string.IsNullOrWhiteSpace(item.Value))
                    .ToDictionary(item => item.Key, item => item.Value));

            var activityEvent = new ActivityEvent
            {
                WorkspaceId = request.WorkspaceId,
                UserId = request.UserId,
                EventType = Normalize(request.EventType, 100),
                EventGroup = Normalize(request.EventGroup, 40),
                Status = Normalize(request.Status, 20),
                Title = Normalize(request.Title, 160),
                Description = NormalizeOptional(request.Description, 500),
                SubjectType = NormalizeOptional(request.SubjectType, 60),
                SubjectId = NormalizeOptional(request.SubjectId, 100),
                IpAddress = NormalizeOptional(httpContext?.Connection.RemoteIpAddress?.ToString(), 64),
                UserAgent = NormalizeOptional(httpContext?.Request.Headers.UserAgent.ToString(), 500),
                CreatedAtUtc = now
            };

            activityEvent.SetMetadata(metadata);
            activityEvent.UpdatedAtUtc = null;
            _db.ActivityEvents.Add(activityEvent);

            var cutoff = now.Subtract(RetentionPeriod);
            await _db.ActivityEvents
                .Where(item => item.CreatedAtUtc < cutoff)
                .ExecuteDeleteAsync(cancellationToken);

            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to record activity event {EventType}", request.EventType);
        }
    }

    private static string Normalize(string value, int maxLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "unknown" : value.Trim();
        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }

    private static string? NormalizeOptional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }
}
