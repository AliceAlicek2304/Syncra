using Microsoft.Extensions.DependencyInjection;

namespace Syncra.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<Interfaces.IPostService, Services.PostService>();
        services.AddScoped<Interfaces.IIntegrationTokenRefreshService, Services.IntegrationTokenRefreshService>();
        return services;
    }
}
