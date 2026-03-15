using Microsoft.Extensions.DependencyInjection;

namespace Syncra.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        services.AddScoped<Interfaces.IPostService, Services.PostService>();
        services.AddScoped<Interfaces.IIntegrationTokenRefreshService, Services.IntegrationTokenRefreshService>();
        services.AddScoped<Interfaces.IPublishService, Services.PublishService>();
        services.AddScoped<Interfaces.IIntegrationAnalyticsService, Services.IntegrationAnalyticsService>();
        services.AddScoped<Interfaces.IWorkspaceAnalyticsService, Services.WorkspaceAnalyticsService>();
        return services;
    }
}
