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

        services.AddScoped<Interfaces.IAnalyticsExportService, Services.AnalyticsExportService>();
        services.AddScoped<Interfaces.IZernioWorkspaceAnalyticsService, Services.ZernioWorkspaceAnalyticsService>();
        services.AddScoped<Interfaces.IInboxBackfillService, Services.InboxBackfillService>();
        services.AddScoped<Payments.IPaymentWebhookEventDispatcher, Payments.PaymentWebhookEventDispatcher>();
        services.AddScoped<Payments.Handlers.IPaymentWebhookHandler, Payments.Handlers.StripeProductWebhookHandlers>();
        services.AddScoped<Payments.Handlers.IPaymentWebhookHandler, Payments.Handlers.StripePriceWebhookHandlers>();
        services.AddScoped<Payments.Handlers.IPaymentWebhookHandler, Payments.Handlers.StripeSubscriptionWebhookHandlers>();
        services.AddScoped<Payments.Handlers.IPaymentWebhookHandler, Payments.Handlers.SePaySubscriptionWebhookHandler>();
        services.AddScoped<Services.RepurposeService>();
        services.AddScoped<Interfaces.IRepurposeService, Services.AIRepurposeService>();
        services.AddScoped<Interfaces.ITrendsService, Services.TrendsService>();
        services.AddScoped<Interfaces.IPromptEngineeringService, Services.PromptEngineeringService>();
        return services;
    }
}
