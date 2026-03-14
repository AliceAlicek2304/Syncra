using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public static class DependencyInjection
{
    public static IServiceCollection AddSocialIntegrations(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IProviderRegistry, ProviderRegistry>();
        services.AddScoped<IPublishAdapterRegistry, PublishAdapterRegistry>();
        
        // Define retry policy: 3 retries with exponential backoff
        var retryPolicy = HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

        // Define timeout policy: 10 seconds
        var timeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(10));

        // Register specific ISocialProvider implementations with policies
        services.AddHttpClient<ISocialProvider, Providers.XOAuthProvider>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);
        
        services.AddHttpClient<ISocialProvider, Providers.TikTokOAuthProvider>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);
        
        services.AddHttpClient<ISocialProvider, Providers.YouTubeProvider>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);

        // TikTok API Client
        services.AddHttpClient<Publishing.Adapters.TikTok.ITikTokApiClient, Publishing.Adapters.TikTok.TikTokApiClient>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);

        // Register publish adapters with policies
        services.AddHttpClient<IPublishAdapter, Publishing.Adapters.XPublishAdapter>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);
        
        services.AddTransient<IPublishAdapter, Publishing.Adapters.TikTokPublishAdapter>();
        
        services.AddTransient<IPublishAdapter, Publishing.Adapters.YouTubePublishAdapter>();
        
        return services;
    }
}
