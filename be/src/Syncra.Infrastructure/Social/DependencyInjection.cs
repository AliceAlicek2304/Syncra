using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public static class DependencyInjection
{
    public static IServiceCollection AddSocialIntegrations(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<OAuthOptions>(configuration.GetSection(OAuthOptions.SectionName));

        services.AddScoped<IProviderRegistry, ProviderRegistry>();
        services.AddScoped<IPublishAdapterRegistry, PublishAdapterRegistry>();
        services.AddScoped<IAnalyticsAdapterRegistry, AnalyticsAdapterRegistry>();
        
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

        services.AddHttpClient<ISocialProvider, Providers.FacebookProvider>()
            .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(120))
            .AddPolicyHandler(retryPolicy);

        // TikTok API Client
        services.AddHttpClient<Publishing.Adapters.TikTok.ITikTokApiClient, Publishing.Adapters.TikTok.TikTokApiClient>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);

        // Register publish adapters with policies
        services.AddHttpClient<IPublishAdapter, Publishing.Adapters.XPublishAdapter>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);
        
        services.AddTransient<IPublishAdapter, Publishing.Adapters.TikTokPublishAdapter>();
        
        services.AddHttpClient<IPublishAdapter, Publishing.Adapters.YouTubePublishAdapter>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);

        // Facebook video uploads can take longer — use 60s timeout
        var facebookTimeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(60));
        services.AddHttpClient<IPublishAdapter, Publishing.Adapters.FacebookPublishAdapter>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(facebookTimeoutPolicy);

        // Register analytics adapters
        services.AddHttpClient<IAnalyticsAdapter, Publishing.Adapters.YouTube.YouTubeAnalyticsAdapter>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);

        services.AddHttpClient<IAnalyticsAdapter, Publishing.Adapters.Facebook.FacebookInsightsAdapter>()
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(timeoutPolicy);

        return services;
    }
}
