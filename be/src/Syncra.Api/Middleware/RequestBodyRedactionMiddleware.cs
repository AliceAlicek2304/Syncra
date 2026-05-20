using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace Syncra.Api.Middleware;

/// <summary>
/// Middleware that reads the request body, redacts sensitive JSON properties,
/// and pushes the redacted representation into the Serilog LogContext.
/// The original body stream is rewound so downstream middleware can still read it.
/// </summary>
public sealed class RequestBodyRedactionMiddleware
{
    private static readonly string[] SensitiveFields = { "password", "token", "secret", "refreshToken", "refresh_token", "newPassword", "new_password", "currentPassword", "current_password", "api_key", "apiKey", "client_secret", "accessToken", "access_token" };
    private const string Redacted = "***REDACTED***";
    private const string LogContextKey = "RequestBody";

    private readonly RequestDelegate _next;

    public RequestBodyRedactionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        // Only process JSON requests with a body
        var contentType = context.Request.ContentType;
        if (contentType != null && contentType.Contains("application/json", System.StringComparison.OrdinalIgnoreCase)
            && context.Request.ContentLength > 0 && context.Request.ContentLength <= 1024 * 1024 // Max 1MB
            && context.Request.Body.CanSeek)
        {
            // Enable buffering so we can rewind
            context.Request.EnableBuffering();

            // Read the body as string
            using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
            var bodyText = await reader.ReadToEndAsync();

            // Redact sensitive fields
            var redactedBody = RedactSensitiveFields(bodyText);

            // Push to LogContext for Serilog to pick up
            using (LogContext.PushProperty(LogContextKey, redactedBody))
            {
                // Rewind the stream so downstream middleware/controllers can read it
                context.Request.Body.Position = 0;
                await _next(context);
            }

            // Rewind again after the pipeline completes (in case upstream consumed it)
            context.Request.Body.Position = 0;
        }
        else
        {
            await _next(context);
        }
    }

    /// <summary>
    /// Parses JSON and redacts known sensitive property values.
    /// Returns the original text if parsing fails (safe fallback).
    /// </summary>
    private static string RedactSensitiveFields(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var redacted = RedactElement(doc.RootElement);
            return JsonSerializer.Serialize(redacted, new JsonSerializerOptions { WriteIndented = false });
        }
        catch
        {
            // If JSON parsing fails, return original body — don't break the request
            return json;
        }
    }

    private static Dictionary<string, object?> RedactElement(JsonElement element)
    {
        var dict = new Dictionary<string, object?>();

        foreach (var property in element.EnumerateObject())
        {
            if (IsSensitiveField(property.Name))
            {
                dict[property.Name] = Redacted;
            }
            else if (property.Value.ValueKind == JsonValueKind.Object)
            {
                dict[property.Name] = RedactElement(property.Value);
            }
            else if (property.Value.ValueKind == JsonValueKind.Array)
            {
                dict[property.Name] = RedactArray(property.Value);
            }
            else
            {
                dict[property.Name] = ExtractValue(property.Value);
            }
        }

        return dict;
    }

    private static List<object?> RedactArray(JsonElement array)
    {
        var list = new List<object?>();
        foreach (var item in array.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object)
            {
                list.Add(RedactElement(item));
            }
            else if (item.ValueKind == JsonValueKind.Array)
            {
                list.Add(RedactArray(item));
            }
            else
            {
                list.Add(ExtractValue(item));
            }
        }
        return list;
    }

    private static bool IsSensitiveField(string fieldName)
    {
        foreach (var field in SensitiveFields)
        {
            if (string.Equals(fieldName, field, System.StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static object? ExtractValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.ToString()
        };
    }
}
