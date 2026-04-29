using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Application.Common.Behaviors;

namespace Syncra.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(PerformanceBehavior<,>));
        });

        services.AddValidatorsFromAssembly(assembly);

        services.AddScoped<Interfaces.IIntegrationTokenRefreshService, Services.IntegrationTokenRefreshService>();
        services.AddScoped<Interfaces.IPublishService, Services.PublishService>();
        services.AddScoped<Interfaces.IIntegrationAnalyticsService, Services.IntegrationAnalyticsService>();
        services.AddScoped<Interfaces.IWorkspaceAnalyticsService, Services.WorkspaceAnalyticsService>();
        services.AddScoped<Payments.IPaymentWebhookEventDispatcher, Payments.PaymentWebhookEventDispatcher>();
        services.AddScoped<Payments.Handlers.IPaymentWebhookHandler, Payments.Handlers.StripeProductWebhookHandlers>();
        services.AddScoped<Payments.Handlers.IPaymentWebhookHandler, Payments.Handlers.StripePriceWebhookHandlers>();
        return services;
    }
}
