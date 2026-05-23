using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Syncra.Api.Filters;

/// <summary>
/// Action filter that validates the HMAC-SHA256 signature of incoming Zernio webhook requests.
///
/// Usage:
///   - Decorate a controller or action with [ServiceFilter(typeof(ZernioWebhookSignatureFilter))].
///   - Zernio must send the computed HMAC-SHA256 hex signature in the X-Zernio-Signature header.
///   - Requests with a missing or invalid signature are rejected with 400 Bad Request / 401 Unauthorized.
///   - The request body stream is rewound to position 0 after reading so model binding works normally.
/// </summary>
public sealed class ZernioWebhookSignatureFilter : IAsyncActionFilter
{
    private const string SignatureHeader = "X-Zernio-Signature";
    private const string WebhookSecretConfigKey = "Zernio:WebhookSecret";

    private readonly string _webhookSecret;
    private readonly ILogger<ZernioWebhookSignatureFilter> _logger;

    public ZernioWebhookSignatureFilter(IConfiguration configuration, ILogger<ZernioWebhookSignatureFilter> logger)
    {
        _webhookSecret = configuration[WebhookSecretConfigKey]
            ?? throw new InvalidOperationException(
                $"Zernio webhook secret is not configured. Set '{WebhookSecretConfigKey}' in application configuration.");
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var request = context.HttpContext.Request;

        if (!request.Headers.TryGetValue(SignatureHeader, out var signatureHeaderValues)
            || string.IsNullOrWhiteSpace(signatureHeaderValues))
        {
            _logger.LogWarning(
                "Zernio webhook request rejected: missing {Header} header from {RemoteIp}.",
                SignatureHeader,
                context.HttpContext.Connection.RemoteIpAddress);
            context.Result = new BadRequestObjectResult("Missing webhook signature header.");
            return;
        }

        // Enable buffering so the request body stream can be read multiple times
        // (model binding still needs the body after this filter reads it).
        request.EnableBuffering();

        string rawBody;
        using (var reader = new StreamReader(request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true))
        {
            rawBody = await reader.ReadToEndAsync();
        }

        // Rewind for downstream model binders.
        request.Body.Position = 0;

        var receivedSignature = signatureHeaderValues.ToString();

        if (!VerifySignature(rawBody, receivedSignature))
        {
            _logger.LogWarning(
                "Zernio webhook request rejected: invalid signature from {RemoteIp}.",
                context.HttpContext.Connection.RemoteIpAddress);
            context.Result = new UnauthorizedObjectResult("Invalid webhook signature.");
            return;
        }

        await next();
    }

    /// <summary>
    /// Computes the HMAC-SHA256 of <paramref name="payload"/> using the configured webhook secret
    /// and compares it with <paramref name="expectedSignature"/> in constant time to prevent
    /// timing side-channel attacks (T-25-01-01).
    /// </summary>
    private bool VerifySignature(string payload, string expectedSignature)
    {
        var keyBytes = Encoding.UTF8.GetBytes(_webhookSecret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(payloadBytes);
        var computedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // CryptographicOperations.FixedTimeEquals requires equal-length spans; encode both sides
        // as UTF-8 bytes of the lowercase hex string so the comparison is always constant time.
        var computedBytes = Encoding.UTF8.GetBytes(computedSignature);
        var receivedBytes = Encoding.UTF8.GetBytes(expectedSignature.ToLowerInvariant());

        return CryptographicOperations.FixedTimeEquals(computedBytes, receivedBytes);
    }
}
