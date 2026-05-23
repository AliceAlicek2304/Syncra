using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Exceptions;

namespace Syncra.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, _logger);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception, ILogger logger)
    {
        context.Response.ContentType = "application/json";

        if (exception is not DomainException and not FluentValidation.ValidationException and not KeyNotFoundException and not ZernioBillingRequiredException and not ZernioAnalyticsScopeException)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            SentrySdk.CaptureException(exception);
        }
        else if (exception is LinkingRequiredException or OAuthTokenRevokedException)
        {
            logger.LogInformation("Authentication event: {Message} for {Path}", exception.Message, context.Request.Path);
        }
        else
        {
            logger.LogWarning(exception, "Domain exception for {Method} {Path}: {Message}", context.Request.Method, context.Request.Path, exception.Message);
        }

        switch (exception)
        {
            case FluentValidation.ValidationException fluentEx:
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "validation_error",
                    message = "One or more validation errors occurred.",
                    errors = fluentEx.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage })
                });
                break;

            case DomainException domainEx when domainEx.Code == "not_found":
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsJsonAsync(new { code = domainEx.Code, message = domainEx.Message });
                break;

            case DomainException domainEx when domainEx.Code is "invalid_credentials" or "invalid_token":
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { code = domainEx.Code, message = domainEx.Message });
                break;

            case OAuthTokenRevokedException revokedEx:
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "oauth_token_revoked",
                    message = revokedEx.Message,
                    provider = revokedEx.ProviderName
                });
                break;

            case LinkingRequiredException linkingEx:
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new 
                { 
                    code = linkingEx.Code, 
                    message = linkingEx.Message,
                    email = linkingEx.Email,
                    providerKey = linkingEx.ProviderKey,
                    avatarUrl = linkingEx.AvatarUrl
                });
                break;

            case DomainException domainEx:
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { code = domainEx.Code, message = domainEx.Message });
                break;

            case KeyNotFoundException keyEx:
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsJsonAsync(new { code = "not_found", message = keyEx.Message });
                break;

            case Stripe.StripeException stripeEx:
                context.Response.StatusCode = StatusCodes.Status502BadGateway;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "provider_error",
                    message = stripeEx.StripeError?.Message ?? stripeEx.Message
                });
                break;

            case ZernioBillingRequiredException billingEx when billingEx.Reason == "inbox_addon_required":
                logger.LogWarning("Billing gate triggered — inbox add-on required. Reason: {Reason}", billingEx.Reason);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "inbox_addon_required",
                    message = billingEx.Message,
                    reason = billingEx.Reason,
                    dashboardUrl = billingEx.DashboardUrl,
                    details = billingEx.Details
                });
                break;

            case ZernioBillingRequiredException billingEx when billingEx.Reason == "analytics_addon_required":
                logger.LogWarning("Billing gate triggered — analytics add-on required. Reason: {Reason}", billingEx.Reason);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "analytics_addon_required",
                    message = billingEx.Message,
                    reason = billingEx.Reason,
                    details = billingEx.Details
                });
                break;

            case ZernioBillingRequiredException billingEx:
                logger.LogWarning("Billing gate triggered. Reason: {Reason}, Dashboard: {Url}", billingEx.Reason, billingEx.DashboardUrl);
                context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "PAYMENT_REQUIRED",
                    message = billingEx.Message,
                    reason = billingEx.Reason,
                    dashboardUrl = billingEx.DashboardUrl,
                    details = billingEx.Details
                });
                break;

            case ZernioAnalyticsScopeException scopeEx:
                context.Response.StatusCode = StatusCodes.Status412PreconditionFailed;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "analytics_scope_required",
                    message = scopeEx.Message,
                    platform = scopeEx.Platform,
                    reauthorizeUrl = scopeEx.ReauthorizeUrl
                });
                break;

            default:
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "internal_error",
                    message = "An error occurred while processing your request."
                });
                break;
        }
    }
}
