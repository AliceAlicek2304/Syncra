using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public static class DependencyInjection
{
    public static IServiceCollection AddSocialIntegrations(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IProviderRegistry, ProviderRegistry>();
        
        // Register specific ISocialProvider implementations here later
        services.AddHttpClient<ISocialProvider, Providers.XOAuthProvider>();
        services.AddHttpClient<ISocialProvider, Providers.TikTokOAuthProvider>();
        
        return services;
    }
}
