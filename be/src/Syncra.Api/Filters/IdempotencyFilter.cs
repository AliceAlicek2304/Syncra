using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Filters;

/// <summary>
/// Action filter that implements idempotency for mutating endpoints.
///
/// Usage:
///   - Decorate a controller action with [ServiceFilter(typeof(IdempotencyFilter))].
///   - The caller must send an "Idempotency-Key" header with a unique string (e.g. UUID v4).
///   - On the first request the result is stored in the idempotency_records table.
///   - Subsequent requests with the same key return the cached status + body without re-executing.
/// </summary>
public class IdempotencyFilter : IAsyncActionFilter
{
    private const string HeaderName = "Idempotency-Key";

    private readonly AppDbContext _db;
    private readonly ILogger<IdempotencyFilter> _logger;

    public IdempotencyFilter(AppDbContext db, ILogger<IdempotencyFilter> logger)
    {
        _db = db;
        _logger = logger;
    }

    private static string ComputeRequestHash(byte[] bodyBytes)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(bodyBytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Only apply to requests that supply the header
        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var keyValues)
            || string.IsNullOrWhiteSpace(keyValues))
        {
            await next();
            return;
        }

        var key = keyValues.ToString().Trim();
        var path = context.HttpContext.Request.Path.Value ?? string.Empty;
        var method = context.HttpContext.Request.Method;

        // Resolve caller identity
        Guid? userId = null;
        Guid? workspaceId = null;

        var userIdClaim = context.HttpContext.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
            userId = parsedUserId;

        if (context.HttpContext.Items.TryGetValue("WorkspaceId", out var wsIdObj) && wsIdObj is Guid wsId)
            workspaceId = wsId;

        // ── Read request body for hash computation ──────────────────────────
        context.HttpContext.Request.EnableBuffering();
        using var bodyReader = new StreamReader(
            context.HttpContext.Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await bodyReader.ReadToEndAsync();
        context.HttpContext.Request.Body.Position = 0;
        var requestHash = ComputeRequestHash(Encoding.UTF8.GetBytes(body));

        // ── Check for existing idempotency record ────────────────────────────
        var existing = await _db.IdempotencyRecords
            .Where(r => r.Key == key && r.ExpiresAtUtc > DateTime.UtcNow)
            .OrderByDescending(r => r.CreatedAtUtc)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            if (existing.Status == IdempotencyStatus.Pending)
            {
                // Another request with this key is in-flight
                context.Result = new ObjectResult(new
                {
                    statusCode = 409,
                    message = "A request with this Idempotency-Key is already being processed. Please retry later."
                })
                { StatusCode = 409 };
                return;
            }

            if (existing.RequestHash != requestHash)
            {
                _logger.LogWarning(
                    "Idempotency key {Key} reused with different request body. " +
                    "Original hash: {OriginalHash}, New hash: {NewHash}",
                    key, existing.RequestHash, requestHash);

                context.Result = new ConflictObjectResult(new
                {
                    error = "Idempotency key reused with different request body",
                    idempotencyKey = key
                });
                return;
            }

            // Return cached result
            _logger.LogInformation(
                "Idempotency hit for key {Key} on {Path} — returning cached {StatusCode}.",
                key, path, existing.ResponseStatusCode);

            var cachedBody = existing.ResponseBody != null
                ? JsonSerializer.Deserialize<object>(existing.ResponseBody)
                : null;

            context.Result = new ObjectResult(cachedBody)
            {
                StatusCode = existing.ResponseStatusCode ?? 200
            };
            return;
        }

        // ── First-time request: mark as Pending ──────────────────────────────
        var record = new IdempotencyRecord
        {
            Key = key,
            RequestHash = requestHash,
            Endpoint = path,
            Method = method,
            Status = IdempotencyStatus.Pending,
            WorkspaceId = workspaceId,
            UserId = userId,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(1)
        };

        _db.IdempotencyRecords.Add(record);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Created idempotency record for key {Key} on {Method} {Path} with hash {Hash}",
            key, method, path, requestHash);

        // ── Execute the action ───────────────────────────────────────────────
        var executed = await next();

        // ── Persist response ─────────────────────────────────────────────────
        int statusCode = 200;
        string? responseBody = null;

        if (executed.Result is ObjectResult objResult)
        {
            statusCode = objResult.StatusCode ?? 200;
            if (objResult.Value != null)
                responseBody = JsonSerializer.Serialize(objResult.Value);
        }
        else if (executed.Result is StatusCodeResult scr)
        {
            statusCode = scr.StatusCode;
        }

        var isSuccess = statusCode is >= 200 and < 300;

        record.Status = isSuccess ? IdempotencyStatus.Success : IdempotencyStatus.Failure;
        record.ResponseStatusCode = statusCode;
        record.ResponseBody = responseBody;
        record.CompletedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }
}
