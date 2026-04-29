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
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            SentrySdk.CaptureException(ex);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

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
