using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Syncra.Infrastructure.Social;

public static class DependencyInjection
{
    public static IServiceCollection AddSocialIntegrations(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IProviderRegistry, ProviderRegistry>();
        
        // Register specific ISocialProvider implementations here later
        
        return services;
    }
}
