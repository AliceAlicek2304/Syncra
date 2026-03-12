using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public static class DependencyInjection
{
    public static IServiceCollection AddSocialIntegrations(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IProviderRegistry, ProviderRegistry>();
        services.AddSingleton<IPublishAdapterRegistry, PublishAdapterRegistry>();
        
        // Register specific ISocialProvider implementations
        services.AddHttpClient<ISocialProvider, Providers.XOAuthProvider>();
        services.AddHttpClient<ISocialProvider, Providers.TikTokOAuthProvider>();
        services.AddHttpClient<ISocialProvider, Providers.YouTubeProvider>();

        // Register publish adapters
        services.AddHttpClient<IPublishAdapter, Publishing.Adapters.XPublishAdapter>();
        
        return services;
    }
}
