
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Persistence.Interceptors;
using Syncra.Infrastructure.Repositories;
using Syncra.Infrastructure.Services;
using Syncra.Domain.Interfaces;
using Syncra.Application.Options;
using Syncra.Application.Common.Interfaces;
using Syncra.Infrastructure.Social;
using Syncra.Infrastructure.Jobs;
using Syncra.Infrastructure.Storage;
using Syncra.Application.Interfaces;

namespace Syncra.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresOptions = configuration.GetSection(PostgresOptions.SectionName).Get<PostgresOptions>() 
            ?? new PostgresOptions();

        services.AddHttpContextAccessor();
        services.AddScoped<AuditInterceptor>();

        // Bind JwtOptions for both IOptions<JwtOptions> (TokenService) and IJwtOptions (Application handlers)
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        services.AddSingleton<IJwtOptions>(jwtOptions);

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseNpgsql(postgresOptions.ConnectionString);
            options.AddInterceptors(sp.GetRequiredService<AuditInterceptor>());
        });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();
        services.AddScoped<IPostRepository, PostRepository>();
        services.AddScoped<IIdeaRepository, IdeaRepository>();
        services.AddScoped<IGroupRepository, GroupRepository>();
        services.AddScoped<IIntegrationRepository, IntegrationRepository>();
        services.AddScoped<IMediaRepository, MediaRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IPlanRepository, PlanRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<Syncra.Application.Interfaces.ITokenService, Syncra.Infrastructure.Services.TokenService>();
        services.AddScoped<IntegrationTokenRefreshJob>();
        services.AddScoped<IIntegrationTokenRefreshJobScheduler, IntegrationTokenRefreshJobScheduler>();
        services.AddScoped<DuePostPublishJob>();
        services.AddScoped<IDuePostPublishJobScheduler, DuePostPublishJobScheduler>();

        services.AddSocialIntegrations(configuration);

        // Redis distributed cache for analytics query results.
        // Falls back to in-memory cache when no Redis connection string is configured (e.g. local dev).
        var redisOptions = configuration.GetSection(Application.Options.RedisOptions.SectionName)
            .Get<Application.Options.RedisOptions>() ?? new Application.Options.RedisOptions();
        if (!string.IsNullOrWhiteSpace(redisOptions.ConnectionString))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisOptions.ConnectionString;
                options.InstanceName = "syncra:";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        services.AddScoped<IAnalyticsCache, AnalyticsCacheService>();
        services.AddScoped<IStorageService, LocalMediaStorage>();
        services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));
        services.Configure<StripeOptions>(configuration.GetSection(StripeOptions.SectionName));
        services.Configure<AnalyticsOptions>(configuration.GetSection(AnalyticsOptions.SectionName));
        services.AddScoped<IStripeService, StripeService>();

        return services;
    }
}
