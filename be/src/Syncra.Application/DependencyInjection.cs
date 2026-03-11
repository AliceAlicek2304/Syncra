using Microsoft.Extensions.DependencyInjection;

namespace Syncra.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Application layer service registrations will go here
        return services;
    }
}
